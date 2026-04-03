import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import SpotifyProvider from 'next-auth/providers/spotify';
import { supabaseAdmin } from '@/lib/supabase';
import { refreshSpotifyAccessToken } from '@/lib/spotify-auth';

import { ADMIN_EMAILS, isMasterAdmin } from '@/lib/constants';

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, ...message) {
      const errStr = String((code as any)?.message || code || '');
      if (errStr.includes('JWTSessionError') || errStr.includes('307')) return;
      console.error(code, ...message);
    },
    warn(code, ...message) {
      const warnStr = String((code as any)?.message || code || '');
      if (warnStr.includes('JWTSessionError') || warnStr.includes('307')) return;
      console.warn(code, ...message);
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "user-read-email user-read-private user-read-playback-state user-modify-playback-state streaming"
        }
      }
    }),
  ],
  // Use JWT strategy (no database needed)
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      try {
        // 1. Handle explicit session updates (fired from SpotifyContext)
      if (trigger === 'update' && session) {
        if (session.spotifyAccessToken) token.spotifyAccessToken = session.spotifyAccessToken;
        if (session.spotifyTokenExpiresAt) token.spotifyTokenExpiresAt = session.spotifyTokenExpiresAt;
        if (session.spotifyRefreshToken) token.spotifyRefreshToken = session.spotifyRefreshToken;
        // Do NOT return early — we need to fall through to persist this to the DB later
      }

      // Store provider-specific tokens
      if (account) {
        if (account.provider === 'spotify') {
          token.spotifyAccessToken = account.access_token;
          token.spotifyRefreshToken = account.refresh_token;
          token.spotifyTokenExpiresAt = Date.now() + (Number(account.expires_in) || 3600) * 1000;
        } else if (account.provider === 'google') {
          token.accessToken = account.access_token;
        }
      }

      // 2. PERFORM SPOTIFY TOKEN REFRESH ROTATION
      // If we have a Spotify refresh token and it's expired (or close to it), refresh now.
      if (token.spotifyRefreshToken) {
        const isRecentlyUpdated = trigger === 'update';
        const shouldRefresh = 
          !isRecentlyUpdated && (
          !token.spotifyTokenExpiresAt || 
          Date.now() > (token.spotifyTokenExpiresAt as number) - 300000
          );
        
        if (shouldRefresh) {
          try {
            token = await refreshSpotifyAccessToken(token);
          } catch (refreshErr) {
            console.error('[AUTH] Proactive Spotify token refresh failed:', refreshErr);
          }
        }
      }

      // Perform DB role lookup if we have an email
      const email = user?.email || (token?.email as string | undefined);
      if (email) {
        try {
          const isMasterAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase().trim() === email.toLowerCase().trim());
          let dbRole = 'student';
          
          const { data, error } = await supabaseAdmin
              .from('user_roles')
              .select('id, role, is_onboarded, streak_count, last_login, spotify_refresh_token')
              .eq('email', email)
              .maybeSingle();

            if (error) throw error;

            // 3. PERSISTENT IDENTITY HYDRATION:
            // Determine if we need to load or save Spotify credentials
            if (data?.spotify_refresh_token && !token.spotifyRefreshToken) {
              console.log('[AUTH] Hydrating Spotify token from DB for user:', email);
              token.spotifyRefreshToken = data.spotify_refresh_token;
              try {
                token = await refreshSpotifyAccessToken(token);
              } catch (refreshErr) {
                console.error('[AUTH] Failed to refresh hydrated token:', refreshErr);
              }
            }

            let streakCount = data?.streak_count || 1;

            if (data) {
              dbRole = data.role;
              token.dbUserId = data.id;
              token.isOnboarded = data.is_onboarded;
            } else {
              const insertData: { email: string; role: string } = { 
                email: email, 
                role: 'student'
              };
              
              const { data: newUser, error: insertError } = await supabaseAdmin
                .from('user_roles')
                .upsert(insertData, { onConflict: 'email' })
                .select('id')
                .single();
              
              if (insertError) throw insertError;

              if (newUser) {
                token.dbUserId = newUser.id;
              }
              streakCount = 1;
              token.isOnboarded = false;
            }

            // 4. POST-IDENTITY SAVE: Now that we definitely have a dbUserId, save the Spotify token if it was just received
            if (token.spotifyRefreshToken && token.dbUserId) {
              console.log('[AUTH] Persisting Spotify link to DB for user ID:', token.dbUserId);
              await supabaseAdmin
                .from('user_roles')
                .update({ spotify_refresh_token: token.spotifyRefreshToken })
                .eq('id', token.dbUserId);
            }

            token.isAdmin = isMasterAdminEmail || dbRole === 'teacher' || dbRole === 'admin' || dbRole === 'superadmin';
            token.isSuperAdmin = isMasterAdminEmail || dbRole === 'superadmin';
            token.streakCount = streakCount;
            token.isBanned = (dbRole === 'banned');
          } catch (err) {
            console.error('[AUTH] Supabase identity lookup FATAL failure:', err);
            // On a fatal DB failure, we still want to return the token to allow partial app access
          }
        }
        
        } catch (jwtErr) {
          console.error('[AUTH] Root JWT callback CRITICAL error:', jwtErr);
        }
        
        return token;
      },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.dbUserId as string) ?? token.sub;
        session.user.accessToken = token.accessToken as string;
        session.user.spotifyAccessToken = token.spotifyAccessToken as string;
        session.user.spotifyRefreshToken = token.spotifyRefreshToken as string;
        session.user.spotifyTokenExpiresAt = token.spotifyTokenExpiresAt as number;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture as string | null | undefined ?? session.user.image;
        session.user.isAdmin = !!token.isAdmin;
        session.user.isSuperAdmin = !!token.isSuperAdmin;
        session.user.isBanned = !!token.isBanned;
        session.user.isOnboarded = !!token.isOnboarded;
        session.user.streakCount = (token.streakCount as number) ?? 0;

        if (isMasterAdmin(session.user.email)) {
          session.user.isAdmin = true;
          session.user.isSuperAdmin = true;
          session.user.streakCount = Math.max(session.user.streakCount || 0, 365);
        }
      }
      return session;
    },
  },
});
