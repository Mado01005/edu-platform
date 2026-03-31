import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      isSuperAdmin: boolean
      isBanned: boolean
      isOnboarded: boolean
      streakCount: number
      accessToken?: string
      spotifyAccessToken?: string
      spotifyRefreshToken?: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    streakCount?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    dbUserId?: string
    isAdmin?: boolean
    isSuperAdmin?: boolean
    isBanned?: boolean
    isOnboarded?: boolean
    streakCount?: number
    accessToken?: string
    spotifyAccessToken?: string
    spotifyRefreshToken?: string
  }
}
