import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import SpotifyProvider from 'next-auth/providers/spotify';
import { supabaseAdmin } from '@/lib/supabase';

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
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: "https://accounts.spotify.com/authorize?scope=streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative&prompt=consent",
    }),
  ],
  // Use JWT strategy (no database needed)
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Store provider-specific tokens
      if (account) {
        if (account.provider === 'spotify') {
          token.spotifyAccessToken = account.access_token;
          token.spotifyRefreshToken = account.refresh_token;
          // Store expiry timestamp (Spotify tokens expire in 1 hour / 3600s)
          token.spotifyTokenExpiresAt = Date.now() + (account.expires_in as number) * 1000;
          // Spotify is music-only — skip DB role lookup for Spotify sign-ins.
          // The user's profile role is already in the token from their Google sign-in.
          return token;
        } else {
          token.accessToken = account.access_token;
        }
      }

      // Auto-refresh Spotify token if expired or about to expire (5 min buffer)
      if (token.spotifyRefreshToken && token.spotifyTokenExpiresAt) {
        const expiresAt = token.spotifyTokenExpiresAt as number;
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (now >= expiresAt - FIVE_MINUTES) {
          try {
            console.log('[AUTH] Spotify token expired or expiring soon, refreshing...');
            const clientId = process.env.SPOTIFY_CLIENT_ID;
            const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

            if (clientId && clientSecret) {
              const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                  grant_type: 'refresh_token',
                  refresh_token: token.spotifyRefreshToken as string,
                }),
              });

              if (response.ok) {
                const data = await response.json();
                token.spotifyAccessToken = data.access_token;
                token.spotifyTokenExpiresAt = Date.now() + data.expires_in * 1000;
                // Spotify may rotate the refresh token
                if (data.refresh_token) {
                  token.spotifyRefreshToken = data.refresh_token;
                }
                console.log('[AUTH] Spotify token refreshed successfully ✅');
              } else {
                console.error('[AUTH] Spotify token refresh failed:', response.status);
              }
            }
          } catch (err) {
            console.error('[AUTH] Spotify token refresh exception (non-fatal):', err);
          }
        }
      }

      // Only perform DB role lookup on initial Google sign-in (when user object is present)
      if (user && user.email) {
        try {
          const isMasterAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase().trim() === user.email?.toLowerCase().trim());
          let dbRole = 'student';
          
          // 1. Fetch user role and streak data
          const { data } = await supabaseAdmin
            .from('user_roles')
            .select('id, role, is_onboarded, streak_count, last_login')
            .eq('email', user.email)
            .maybeSingle();

          let streakCount = data?.streak_count || 1;

          if (data) {
            dbRole = data.role;
            token.id = data.id;
            token.dbUserId = data.id;
            token.isOnboarded = data.is_onboarded;
          } else {
            // New user initialization
            const insertData: { email: string; role: string } = { 
              email: user.email, 
              role: 'student'
            };
            
            const { data: newUser } = await supabaseAdmin
              .from('user_roles')
              .upsert(insertData, { onConflict: 'email' })
              .select('id')
              .single();
            
            if (newUser) {
              token.dbUserId = newUser.id;
              token.id = newUser.id;
            }
            streakCount = 1;
          }

          token.isAdmin = isMasterAdminEmail || dbRole === 'teacher' || dbRole === 'admin' || dbRole === 'superadmin';
          token.isSuperAdmin = isMasterAdminEmail || dbRole === 'superadmin';
          token.streakCount = streakCount;
          if (dbRole === 'banned') token.isBanned = true;
        } catch (err) {
          // Log but do not crash — a DB error must NOT prevent login
          console.error('[AUTH] Supabase role lookup failed (non-fatal):', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.dbUserId as string) ?? token.sub;
        session.user.accessToken = token.accessToken as string;
        session.user.spotifyAccessToken = token.spotifyAccessToken as string;
        session.user.spotifyRefreshToken = token.spotifyRefreshToken as string;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture as string | null | undefined ?? session.user.image;
        session.user.isAdmin = !!token.isAdmin;
        session.user.isSuperAdmin = !!token.isSuperAdmin;
        session.user.isBanned = !!token.isBanned;
        session.user.isOnboarded = !!token.isOnboarded;
        session.user.streakCount = (token.streakCount as number) ?? 0;

        // God Mode override for master admins
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
