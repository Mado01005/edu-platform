import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.spotifyRefreshToken) {
      return NextResponse.json({ error: 'No refresh token available' }, { status: 401 });
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.user.spotifyRefreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[SPOTIFY REFRESH] Token refresh failed:', errorData);
      return NextResponse.json({ error: 'Token refresh failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ 
      access_token: data.access_token,
      expires_in: data.expires_in 
    });
  } catch (error) {
    console.error('[SPOTIFY REFRESH] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}