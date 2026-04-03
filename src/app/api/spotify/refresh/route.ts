import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.spotifyRefreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available. Please reconnect Spotify.' },
        { status: 401 }
      );
    }

    const refreshToken = session.user.spotifyRefreshToken;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[SPOTIFY REFRESH] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Call Spotify token endpoint to refresh
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[SPOTIFY REFRESH] Token refresh failed from Spotify:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to refresh token', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[SPOTIFY REFRESH] Token refreshed successfully ✅');

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token || null,
    });
  } catch (error) {
    console.error('[SPOTIFY REFRESH] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}