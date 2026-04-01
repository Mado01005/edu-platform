'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import Script from 'next/script';
import { useSession } from 'next-auth/react';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt: string;
  uri: string;
}

interface SpotifyContextType {
  player: any | null;
  deviceId: string | null;
  isActive: boolean;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  hasToken: boolean;
  accessToken: string | null;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  transferPlayback: () => Promise<void>;
  isPremiumRequired: boolean;
  isTokenExpired: boolean;
  volume: number;
  setSpotifyVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider = ({ children, accessToken, refreshToken, tokenExpiresAt }: { children: ReactNode; accessToken?: string; refreshToken?: string; tokenExpiresAt?: number }) => {
  const [player, setPlayer] = useState<any | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [currentAccessToken, setCurrentAccessToken] = useState<string | undefined>(accessToken);
  const [currentTokenExpiresAt, setCurrentTokenExpiresAt] = useState<number | undefined>(tokenExpiresAt);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  const { update: updateSession } = useSession();

  // Sync props into state when layout re-renders with fresh server-side tokens
  useEffect(() => {
    if (accessToken && accessToken !== currentAccessToken) {
      setCurrentAccessToken(accessToken);
    }
    if (tokenExpiresAt && tokenExpiresAt !== currentTokenExpiresAt) {
      setCurrentTokenExpiresAt(tokenExpiresAt);
    }
  }, [accessToken, tokenExpiresAt]);

  // Deduplicated refresh: prevents multiple concurrent refresh calls
  const refreshSpotifyToken = useCallback(async (): Promise<string | null> => {
    // If a refresh is already in-flight, piggyback on it
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const doRefresh = async (): Promise<string | null> => {
      if (!refreshToken) {
        console.error('[SPOTIFY] No refresh token available');
        setIsTokenExpired(true);
        return null;
      }

      try {
        console.log('[SPOTIFY] Refreshing access token via /api/spotify/refresh...');
        const response = await fetch('/api/spotify/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[SPOTIFY] Token refresh failed:', response.status, errorData);
          // Only mark as expired on 401 (truly revoked), not on transient 5xx
          if (response.status === 401 || response.status === 400) {
            setIsTokenExpired(true);
          }
          return null;
        }

        const data = await response.json();
        const newToken = data.access_token as string;
        const newExpiresIn = (data.expires_in as number) || 3600;

        // Update local state immediately so the SDK picks it up
        setCurrentAccessToken(newToken);
        setCurrentTokenExpiresAt(Date.now() + newExpiresIn * 1000);
        setIsTokenExpired(false);

        console.log('[SPOTIFY] Token refreshed ✅ (expires in', newExpiresIn, 's)');

        // Force NextAuth to re-sync the session on the server and client
        try {
          // IMPORTANT: next-auth v5 session update requires specific flat object structure
          // to be merged into the session.
          await updateSession({
            spotifyAccessToken: newToken,
            spotifyTokenExpiresAt: Date.now() + newExpiresIn * 1000
          });
          console.log('[SPOTIFY] NextAuth session updated ✅');
        } catch (sessionErr) {
          console.warn('[SPOTIFY] NextAuth session update failed (ignoring):', sessionErr);
          // Fallback: browser-side session reload
          fetch('/api/auth/session').catch(() => {});
        }

        return newToken;
      } catch (error) {
        console.error('[SPOTIFY] Token refresh exception:', error);
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    };

    refreshInFlightRef.current = doRefresh();
    return refreshInFlightRef.current;
  }, [refreshToken]);

  // Proactive background refresh: fires 5 min before expiry so the SDK never sees an expired token
  useEffect(() => {
    if (!refreshToken || !currentTokenExpiresAt) return;

    const scheduleRefresh = () => {
      const msUntilExpiry = currentTokenExpiresAt! - Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;
      const delay = Math.max(msUntilExpiry - FIVE_MINUTES, 0);

      console.log('[SPOTIFY] Proactive refresh scheduled in', Math.round(delay / 1000), 's');
      return setTimeout(() => {
        refreshSpotifyToken();
      }, delay);
    };

    const timerId = scheduleRefresh();
    return () => clearTimeout(timerId);
  }, [currentTokenExpiresAt, refreshToken, refreshSpotifyToken]);

  // Access-token ref for closures that need the live value
  const tokenRef = useRef(currentAccessToken || accessToken);
  useEffect(() => {
    tokenRef.current = currentAccessToken || accessToken;
  }, [currentAccessToken, accessToken]);

  useEffect(() => {
    const tokenToUse = currentAccessToken || accessToken;
    if (!tokenToUse) return;

    let localPlayer: any = null;

    const initializePlayer = () => {
      console.log('[SPOTIFY] Initializing SDK...');
      if (typeof window.Spotify === 'undefined') {
        console.warn('[SPOTIFY] SDK script not loaded yet');
        return;
      }

      const newPlayer = new (window.Spotify.Player as any)({
        name: 'EduPortal High-Fidelity Player',
        getOAuthToken: async (cb: (token: string) => void) => {
          try {
            // Always read the latest token from the ref
            const liveToken = tokenRef.current;
            const expiresAt = currentTokenExpiresAt;
            const FIVE_MINUTES = 5 * 60 * 1000;

            if (expiresAt && Date.now() >= expiresAt - FIVE_MINUTES) {
              console.log('[SPOTIFY] Token expiring, refreshing before handing to SDK...');
              const freshToken = await refreshSpotifyToken();
              cb(freshToken || liveToken || '');
            } else {
              cb(liveToken || '');
            }
          } catch (err) {
            console.error('[SPOTIFY] getOAuthToken error:', err);
            cb(tokenRef.current || '');
          }
        },
        volume: 0.5,
      });
      localPlayer = newPlayer;

      newPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('[SPOTIFY] SDK Ready — Device:', device_id);
        setDeviceId(device_id);

        // Auto-transfer using the LIVE token (not the stale prop)
        setTimeout(async () => {
          const liveToken = tokenRef.current;
          if (!liveToken) return;
          try {
            const res = await fetch('https://api.spotify.com/v1/me/player', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${liveToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ device_ids: [device_id], play: true }),
            });

            if (res.ok) {
              console.log('[SPOTIFY] Auto-transfer ✅');
              setIsActive(true);
              const state = await newPlayer.getCurrentState();
              if (state) {
                const track = state.track_window.current_track;
                setCurrentTrack({
                  name: track.name,
                  artist: track.artists.map((a: any) => a.name).join(', '),
                  albumArt: track.album.images[0].url,
                  uri: track.uri,
                });
                setIsPlaying(!state.paused);
              }
            } else if (res.status === 401) {
              // Token was stale — refresh and retry once
              console.warn('[SPOTIFY] Auto-transfer 401 — refreshing token and retrying...');
              const freshToken = await refreshSpotifyToken();
              if (freshToken) {
                const retry = await fetch('https://api.spotify.com/v1/me/player', {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${freshToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ device_ids: [device_id], play: true }),
                });
                if (retry.ok) {
                  console.log('[SPOTIFY] Auto-transfer retry ✅');
                  setIsActive(true);
                }
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              console.error('[SPOTIFY] Auto-transfer failed:', res.status, errData);
            }
          } catch (err) {
            console.error('[SPOTIFY] Auto-transfer network error:', err);
          }
        }, 1000);
      });

      newPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('[SPOTIFY] Device offline:', device_id);
      });

      newPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        setIsActive(true);
        const track = state.track_window.current_track;
        if (track) {
          setCurrentTrack({
            name: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            albumArt: track.album.images[0].url,
            uri: track.uri,
          });
        }
      });

      newPlayer.addListener('initialization_error', ({ message }: { message: string }) =>
        console.error('[SPOTIFY] Init error:', message)
      );

      const authFailureCount = { current: 0 };

      newPlayer.addListener('authentication_error', async ({ message }: { message: string }) => {
        console.error('[SPOTIFY] Auth error:', message);
        authFailureCount.current++;
        
        const newToken = await refreshSpotifyToken();
        if (!newToken) {
          setIsTokenExpired(true);
        } else if (authFailureCount.current > 3) {
          // If we keep getting auth errors despite refreshing (SDK stuck?), 
          // perform total teardown and retry
          console.warn('[SPOTIFY] Persistent auth errors. Re-initializing link...');
          newPlayer.disconnect();
          setTimeout(() => newPlayer.connect(), 2000);
          authFailureCount.current = 0;
        }
        // SDK will re-call getOAuthToken automatically after this
      });

      newPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('[SPOTIFY] Account error:', message);
        setIsPremiumRequired(true);
      });

      newPlayer.addListener('playback_error', ({ message }: { message: string }) =>
        console.error('[SPOTIFY] Playback error:', message)
      );

      newPlayer.connect().then((success: boolean) => {
        console.log(success ? '[SPOTIFY] Connected ✅' : '[SPOTIFY] Connection failed ❌');
      });

      setPlayer(newPlayer);
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }

    return () => {
      localPlayer?.disconnect();
    };
  }, [currentAccessToken, accessToken]);

  const togglePlay = () => player?.togglePlay();
  const nextTrack = () => player?.nextTrack();
  const previousTrack = () => player?.previousTrack();

  const setSpotifyVolume = useCallback(async (v: number) => {
    // 1. Context check
    if (!player) return;
    
    // 2. SDK Method validation (Strict Requirement)
    if (typeof player.setVolume !== 'function') {
      console.warn('[SPOTIFY] setVolume method not yet attached to player instance.');
      return;
    }

    try {
      // 3. Promise Handling (Strict Requirement)
      await player.setVolume(v).catch((err: any) => {
        console.error('[SPOTIFY] API rejected volume change:', err);
      });
      setVolume(v);
      if (v > 0) setIsMuted(false);
    } catch (err) {
      console.error('[SPOTIFY] Fatal volume control exception:', err);
    }
  }, [player]);

  const transferPlayback = async () => {
    const liveToken = currentAccessToken || accessToken;
    if (!deviceId || !liveToken) return;
    
    try {
      let tokenToUse = liveToken;

      const res = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
      });

      if (res.ok) {
        console.log('[SPOTIFY] Transfer ✅');
        setIsActive(true);
      } else if (res.status === 401) {
        // Stale token — refresh and retry once
        const freshToken = await refreshSpotifyToken();
        if (freshToken) {
          const retry = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${freshToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ device_ids: [deviceId], play: false }),
          });
          if (retry.ok) {
            console.log('[SPOTIFY] Transfer retry ✅');
            setIsActive(true);
          }
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[SPOTIFY] Transfer failed:', res.status, errorData);
      }
    } catch (err: any) {
      console.error('[SPOTIFY] Transfer exception:', err.message || err);
    }
  };

  return (
    <SpotifyContext.Provider
      value={{
        player,
        deviceId,
        isActive,
        currentTrack,
        isPlaying,
        hasToken: !!(currentAccessToken || accessToken),
        accessToken: (currentAccessToken || accessToken) || null,
        togglePlay,
        nextTrack,
        previousTrack,
        transferPlayback,
        isPremiumRequired,
        isTokenExpired,
        volume,
        setSpotifyVolume,
        isMuted,
        setIsMuted
      }}
    >
      {accessToken && (
        <Script
          src="https://sdk.scdn.co/spotify-player.js"
          strategy="afterInteractive"
        />
      )}
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = () => {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
};
