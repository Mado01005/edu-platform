import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

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
      if (user) {
        token.isAdmin = user.email === ADMIN_EMAIL;
      }
      // If returning user, isAdmin should already be on the token if saved previously,
      // but let's aggressively set it based on email just in case
      if (token.email) {
        token.isAdmin = token.email === ADMIN_EMAIL;
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
