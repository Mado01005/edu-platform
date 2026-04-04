/**
 * Comprehensive authentication type definitions
 */

import { JWT } from 'next-auth/jwt';

/**
 * Extended JWT token interface with all custom fields
 */
export interface ExtendedJWT extends JWT {
  dbUserId?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isBanned?: boolean;
  isOnboarded?: boolean;
  streakCount?: number;
  accessToken?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyTokenExpiresAt?: number;
  error?: string;
  
  // NextAuth standard fields that we might use
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  sub?: string;
}

/**
 * Extended session interface
 */
export interface ExtendedSession {
  accessToken?: string;
  user: {
    id: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isBanned: boolean;
    isOnboarded: boolean;
    streakCount: number;
    accessToken?: string;
    spotifyAccessToken?: string;
    spotifyRefreshToken?: string;
    spotifyTokenExpiresAt?: number;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
}

/**
 * Safe type guard for ExtendedJWT
 */
export function isExtendedJWT(token: unknown): token is ExtendedJWT {
  return typeof token === 'object' && token !== null;
}

/**
 * Safe type guard for session with admin check
 */
export function isAdminSession(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  
  const user = (session as any)?.user;
  if (!user || typeof user !== 'object') return false;
  
  return !!user.isAdmin;
}

/**
 * Safe type guard for session with super admin check
 */
export function isSuperAdminSession(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  
  const user = (session as any)?.user;
  if (!user || typeof user !== 'object') return false;
  
  return !!user.isSuperAdmin;
}

/**
 * Utility to safely extract user ID from session
 */
export function getUserIdFromSession(session: unknown): string | null {
  if (!session || typeof session !== 'object') return null;
  
  const user = (session as any)?.user;
  if (!user || typeof user !== 'object') return null;
  
  return user.id || null;
}

/**
 * Utility to safely extract Spotify tokens from session
 */
export function getSpotifyTokensFromSession(session: unknown): {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
} {
  if (!session || typeof session !== 'object') {
    return {};
  }
  
  const user = (session as any)?.user;
  if (!user || typeof user !== 'object') {
    return {};
  }
  
  return {
    accessToken: user.spotifyAccessToken,
    refreshToken: user.spotifyRefreshToken,
    expiresAt: user.spotifyTokenExpiresAt,
  };
}