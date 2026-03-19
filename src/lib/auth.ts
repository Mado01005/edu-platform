// Simple credential-based auth — replace with a real provider for production
export const DEMO_USERS = [
  { username: 'student', password: 'student123', name: 'Student User' },
  { username: 'admin', password: 'admin123', name: 'Administrator' },
];

export function validateCredentials(
  username: string,
  password: string
): { username: string; name: string } | null {
  const user = DEMO_USERS.find(
    (u) => u.username === username && u.password === password
  );
  return user ? { username: user.username, name: user.name } : null;
}

export const AUTH_COOKIE = 'edu_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
