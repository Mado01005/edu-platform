// Mock for next/headers
export function headers() {
  return new Map([['host', 'localhost:3000']]);
}
export function cookies() {
  return { get: () => null, set: () => {} };
}
