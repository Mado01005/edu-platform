import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Spotify from 'next-auth/providers/spotify';
import { supabaseAdmin } from '@/lib/supabase';

import { ADMIN_EMAILS } from '@/lib/constants';

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: 'https://accounts.spotify.com/authorize?scope=user-read-email%20user-read-private%20streaming%20user-modify-playback-state%20user-read-playback-state',
    }),
  ],
  // Use JWT strategy (no database needed)
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        if (account.provider === 'spotify') {
          token.spotifyAccessToken = account.access_token;
        } else {
          token.accessToken = account.access_token;
        }
      }
      if (user && user.email) {
        // ...Existing role logic...
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
