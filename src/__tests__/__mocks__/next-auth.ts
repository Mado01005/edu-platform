// Mock for next-auth
const NextAuth = () => ({
  handlers: { GET: jest.fn(), POST: jest.fn() },
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
});
export default NextAuth;
export const auth = jest.fn();
export const signIn = jest.fn();
export const signOut = jest.fn();
