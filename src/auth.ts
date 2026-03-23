import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

export const ADMIN_EMAILS = ['abdallahsaad2150@gmail.com', 'abdallahsaad828asd@gmail.com'];
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

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
        const isMasterAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
        let dbRole = 'student';
        
        const { data } = await supabaseAdmin.from('user_roles').select('role').eq('email', user.email).maybeSingle();
        if (data) {
          dbRole = data.role;
        } else {
          // This is their absolute first time logging into the platform! 
          // We automatically register them into the database natively as a permanent 'student'
          await supabaseAdmin.from('user_roles').insert({ email: user.email, role: 'student' });
        }

        if (dbRole === 'banned') token.isBanned = true;
        
        token.isSuperAdmin = isMasterAdmin || dbRole === 'superadmin';
        token.isAdmin = isMasterAdmin || dbRole === 'teacher' || dbRole === 'admin' || dbRole === 'superadmin';
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
        // @ts-expect-error
        session.user.isSuperAdmin = token.isSuperAdmin ?? false;
        // @ts-expect-error
        session.user.isBanned = token.isBanned ?? false;
      }
      return session;
    },
  },
});
