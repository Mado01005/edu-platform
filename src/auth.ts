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
          
          const { data } = await supabaseAdmin.from('user_roles').select('role, is_onboarded').eq('email', user.email).maybeSingle();
          if (data) {
            dbRole = data.role;
            token.isOnboarded = data.is_onboarded;
          } else {
            await supabaseAdmin.from('user_roles').upsert({ email: user.email, role: 'student' }, { onConflict: 'email' });
          }

          if (dbRole === 'banned') token.isBanned = true;
          
          token.isSuperAdmin = isMasterAdminEmail || dbRole === 'superadmin';
          token.isAdmin = isMasterAdminEmail || dbRole === 'teacher' || dbRole === 'admin' || dbRole === 'superadmin';
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
      }
      return session;
    },
  },
});
