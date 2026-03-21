import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

export const ADMIN_EMAIL = 'abdallahsaad2150@gmail.com';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Use JWT strategy (no database needed)
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.email) {
        // This 'user' object is only present on the very first sign-in moment.
        // We do our heavy database query here and 'bake' the result into the token forever.
        const isMasterAdmin = user.email === ADMIN_EMAIL;
        let isTeacher = false;
        
        if (!isMasterAdmin) {
           const { data } = await supabaseAdmin.from('user_roles').select('role').eq('email', user.email).single();
           if (data?.role === 'teacher' || data?.role === 'admin') isTeacher = true;
        }
        
        token.isAdmin = isMasterAdmin || isTeacher;
      }
      return token;
    },
    // Make user info available in the session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture as string | null | undefined ?? session.user.image;
        // @ts-expect-error - Adding custom property to session user
        session.user.isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
});
