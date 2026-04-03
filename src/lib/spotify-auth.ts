import { JWT } from "next-auth/jwt";

export async function refreshSpotifyAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = "https://accounts.spotify.com/api/token";
    const body = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.spotifyRefreshToken as string,
    });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body,
    });

    const refreshedTokens = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[SPOTIFY-AUTH] Refresh failed:", response.status, refreshedTokens);
      throw refreshedTokens;
    }

    return {
      ...token,
      spotifyAccessToken: refreshedTokens.access_token,
      spotifyTokenExpiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      spotifyRefreshToken: refreshedTokens.refresh_token ?? token.spotifyRefreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing spotify access token", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
