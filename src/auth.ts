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
          token.spotifyTokenExpiresAt = Date.now() + (account.expires_in as number) * 1000;
          // Don't return here! Continue below to ensure dbUserId and roles are preserved.
        } else {
          token.accessToken = account.access_token;
        }
      }

      // The Spotify Token lifecycle is now robustly managed client-side in `SpotifyContext.tsx`.
      // We removed the synchronous server-side fetch to `accounts.spotify.com` from this callback
      // because NextAuth fires the `jwt` callback on almost every page transition/window focus.
      // Doing external API calls here caused massive latency, rate limits, and random 401s when it timed out.

      // Perform DB role lookup if we have an email
      // This is wrapped in a try/catch to NEVER drop the session if Supabase has a transient timeout.
      const email = user?.email || (token?.email as string | undefined);
      if (email) {
        try {
          const isMasterAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase().trim() === email.toLowerCase().trim());
          let dbRole = 'student';
          
          // Only hit the DB if we are missing critical identity claims, or if this is a fresh login (user object exists)
          // This drastically reduces DB load and prevents "Poisoned Sessions" from timeouts.
          if (user || !token.dbUserId) {
            // 1. Fetch user role and streak data
            const { data, error } = await supabaseAdmin
              .from('user_roles')
              .select('id, role, is_onboarded, streak_count, last_login')
              .eq('email', email)
              .maybeSingle();

            if (error) throw error;

            let streakCount = data?.streak_count || 1;

            if (data) {
              dbRole = data.role;
              token.id = data.id;
              token.dbUserId = data.id;
              token.isOnboarded = data.is_onboarded;
            } else {
              // New user initialization (graceful provisioning)
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
                token.id = newUser.id;
              }
              streakCount = 1;
              token.isOnboarded = false;
            }

            token.isAdmin = isMasterAdminEmail || dbRole === 'teacher' || dbRole === 'admin' || dbRole === 'superadmin';
            token.isSuperAdmin = isMasterAdminEmail || dbRole === 'superadmin';
            token.streakCount = streakCount;
            token.isBanned = (dbRole === 'banned');
          }
        } catch (err) {
          // A DB error must NOT rewrite the token to blank. We gracefully exit and keep the old claims.
          console.warn('[AUTH] Supabase identity lookup failed (retaining cached claims):', err);
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
        session.user.spotifyTokenExpiresAt = token.spotifyTokenExpiresAt as number;
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
