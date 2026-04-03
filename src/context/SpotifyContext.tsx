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
  spotifyFetch: (url: string, options?: RequestInit) => Promise<any>;
  playUri: (uri?: string, contextUri?: string) => Promise<void>;
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
  const [currentAccessToken, setCurrentAccessToken] = useState<string | undefined>(accessToken?.startsWith('ya29.') ? undefined : accessToken);
  const [currentRefreshToken, setCurrentRefreshToken] = useState<string | undefined>(refreshToken);
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

        const { access_token: newToken, expires_in: newExpiresIn, refresh_token: newRefreshToken } = await response.json();
        
        console.log('[SPOTIFY REFRESH] New token received, updating context and session...');
        
        setCurrentAccessToken(newToken);
        setCurrentTokenExpiresAt(Date.now() + newExpiresIn * 1000);
        if (newRefreshToken) {
          setCurrentRefreshToken(newRefreshToken);
        }
        setIsTokenExpired(false);

        console.log('[SPOTIFY] Token refreshed ✅ (expires in', newExpiresIn, 's)');

        // Update NextAuth session to keep it in sync with the new identity credits
        try {
          await updateSession({
            spotifyAccessToken: newToken,
            spotifyRefreshToken: newRefreshToken || currentRefreshToken,
            spotifyTokenExpiresAt: Date.now() + newExpiresIn * 1000
          });
          console.log('[SPOTIFY] NextAuth session updated ✅');
        } catch (sessionErr) {
          console.warn('[SPOTIFY] NextAuth session update failed (ignoring):', sessionErr);
          // Fallback: browser-side session reload
          fetch('/api/auth/session').catch(() => { });
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
  }, [refreshToken, updateSession, currentRefreshToken]);

  // Authenticated Spotify Fetch Wrapper
  const spotifyFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const liveToken = tokenRef.current;
    if (!liveToken) return null;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${liveToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 401) {
      console.log('[SPOTIFY] 401 on fetch — refreshing and retrying once...');
      const freshToken = await refreshSpotifyToken();
      if (freshToken) {
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json',
          },
        }).then(r => r.json());
      }
    }

    if (res.status === 204) return true;
    return res.json();
  }, [refreshSpotifyToken]);

  const playUri = useCallback(async (uri?: string, contextUri?: string) => {
    if (!deviceId) return;

    const body: any = {};
    if (uri) body.uris = [uri];
    if (contextUri) body.context_uri = contextUri;

    // If no URI is provided, we use the Study Beats fallback to prevent 'no list loaded'
    if (!uri && !contextUri) {
      body.context_uri = 'spotify:playlist:37i9dQZF1DX8U76H9SBrpf';
    }

    await spotifyFetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }, [deviceId, spotifyFetch]);

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

  // Live token used by playback SDK and API wrappers
  const liveToken = (currentAccessToken || accessToken);
  const validatedToken = liveToken?.startsWith('ya29.') ? null : liveToken;
  const tokenRef = useRef(validatedToken);

  useEffect(() => {
    tokenRef.current = validatedToken;
  }, [validatedToken]);

  useEffect(() => {
    // We only want to initialize the SDK ONCE when the script is ready, 
    // regardless of whether the token changes (ref handles those updates).
    if (!accessToken) return;

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
            // ALWAYS use the live ref value to ensure the session never restarts
            // during back-to-back refreshes.
            const liveToken = tokenRef.current;
            const expiresAt = currentTokenExpiresAt;
            const FIVE_MINUTES = 5 * 60 * 1000;

            console.log('[SPOTIFY] getOAuthToken requested by SDK...');

            if (expiresAt && Date.now() >= expiresAt - FIVE_MINUTES) {
              console.log('[SPOTIFY] Token expiring — background refresh to prevent SDK dropout...');
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
          console.warn('[SPOTIFY] Persistent auth errors. Force re-syncing connection...');
          newPlayer.disconnect();
          setTimeout(() => {
            refreshSpotifyToken().then(() => newPlayer.connect());
          }, 2000);
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

      newPlayer.connect().then(async (success: boolean) => {
        console.log(success ? '[SPOTIFY] Connected ✅' : '[SPOTIFY] Connection failed ❌');
        // Final fallback: if connection fails, it's almost certainly because the initial Token 
        // provided during `new Spotify.Player` creation was stale.
        if (!success) {
          console.log('[SPOTIFY] Handshake failed — proactively refreshing for retry...');
          const newToken = await refreshSpotifyToken();
          if (newToken) {
            console.log('[SPOTIFY] Retrying connection with fresh handshake token...');
            newPlayer.connect();
          }
        }
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
  }, []); // Only run once on mount or script ready

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
    const liveToken = tokenRef.current;
    if (!deviceId || !liveToken) return;

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${liveToken}`,
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
        hasToken: !!validatedToken,
        accessToken: validatedToken || null,
        togglePlay,
        nextTrack,
        previousTrack,
        transferPlayback,
        isPremiumRequired,
        isTokenExpired,
        volume,
        setSpotifyVolume,
        isMuted,
        setIsMuted,
        spotifyFetch,
        playUri
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
