import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import SpotifyProvider from 'next-auth/providers/spotify';
import { supabaseAdmin } from '@/lib/supabase';

import { ADMIN_EMAILS } from '@/lib/constants';

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
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
          // Spotify is music-only — skip DB role lookup for Spotify sign-ins.
          // The user's profile role is already in the token from their Google sign-in.
          return token;
        } else {
          token.accessToken = account.access_token;
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

          let streakCount = 1;
          const now = new Date();
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

          if (data) {
            dbRole = data.role;
            token.id = data.id; // Corrected: token.id is more standard for JWT
            token.dbUserId = data.id;
            token.isOnboarded = data.is_onboarded;

            // 2. Calendar-Day Streak Logic (Defensive check for columns)
            if ('streak_count' in data && 'last_login' in data) {
              const lastLoginDate = data.last_login ? new Date(data.last_login) : null;
              if (lastLoginDate) {
                const lastLoginMidnight = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate()).getTime();
                const diffInDays = Math.round((todayMidnight - lastLoginMidnight) / (1000 * 60 * 60 * 24));

                if (diffInDays === 1) {
                  streakCount = (data.streak_count || 0) + 1;
                } else if (diffInDays === 0) {
                  streakCount = data.streak_count || 1;
                } else {
                  streakCount = 1;
                }
              }

              // 3. Update last login and streak in DB
              await supabaseAdmin
                .from('user_roles')
                .update({ 
                  last_login: now.toISOString(),
                  streak_count: streakCount 
                })
                .eq('email', user.email);
            }
          } else {
            // New user initialization (Defensive: try to insert streak, but don't fail if columns missing)
            const insertData: any = { 
              email: user.email, 
              role: 'student'
            };
            
            // We'll check if columns exist by attempting to insert them - but for now just keep it simple
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
        // @ts-expect-error
        session.user.id = token.dbUserId ?? token.sub;
        // @ts-expect-error
        session.user.accessToken = token.accessToken;
        // @ts-expect-error
        session.user.spotifyAccessToken = token.spotifyAccessToken;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture as string | null | undefined ?? session.user.image;
        // @ts-expect-error
        session.user.isAdmin = token.isAdmin ?? false;
        // @ts-expect-error
        session.user.isSuperAdmin = token.isSuperAdmin ?? false;
        // @ts-expect-error
        session.user.isBanned = token.isBanned ?? false;
        // @ts-expect-error
        session.user.isOnboarded = token.isOnboarded ?? false;
        // @ts-expect-error
        session.user.streakCount = token.streakCount ?? 0;

        // Hardcoded God Mode override for primary admin
        if (session.user.email === 'abdallahsaad2150@gmail.com') {
          // @ts-expect-error
          session.user.isAdmin = true;
          // @ts-expect-error
          session.user.isSuperAdmin = true;
          // @ts-expect-error
          session.user.role = 'ADMIN';
        }
      }
      return session;
    },
  },
});
