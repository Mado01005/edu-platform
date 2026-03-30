'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Script from 'next/script';

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
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider = ({ children, accessToken }: { children: ReactNode; accessToken?: string }) => {
  const [player, setPlayer] = useState<any | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    // Track the player instance locally to avoid stale closure in cleanup
    let localPlayer: any = null;

    const initializePlayer = () => {
      console.log('[SPOTIFY DEBUG] Initializing SDK... Token exists:', !!accessToken);
      if (typeof window.Spotify === 'undefined') {
        console.warn('[SPOTIFY DEBUG] Spotify SDK not loaded yet');
        return;
      }

      const newPlayer = new (window.Spotify.Player as any)({
        name: 'EduPortal High-Fidelity Player',
        getOAuthToken: (cb: (token: string) => void) => {
          console.log("[SPOTIFY DEBUG] Token requested by SDK");
          cb(accessToken!);
        },
        volume: 0.5,
      });
      localPlayer = newPlayer;

      // Attach listeners BEFORE connecting
      newPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('[SPOTIFY DEBUG] SDK Ready! Device ID captured:', device_id);
        setDeviceId(device_id);
        
        // Delay auto-transfer by 1s to resolve race condition
        setTimeout(async () => {
          try {
            console.log('[SPOTIFY DEBUG] Attempting Auto-Transfer...');
            const res = await fetch('https://api.spotify.com/v1/me/player', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                device_ids: [device_id],
                play: true,
              }),
            });

            console.log('[SPOTIFY DEBUG] Transfer API Status:', res.status);

            if (res.ok) {
              console.log('[SPOTIFY DEBUG] Auto-transfer successful! ✅');
              setIsActive(true);
              const state = await newPlayer.getCurrentState();
              if (state) {
                console.log('[SPOTIFY DEBUG] Initial state synced after transfer');
                const track = state.track_window.current_track;
                setCurrentTrack({
                  name: track.name,
                  artist: track.artists.map((a: any) => a.name).join(', '),
                  albumArt: track.album.images[0].url,
                  uri: track.uri,
                });
                setIsPlaying(!state.paused);
              }
            } else {
              const errData = await res.json().catch(() => ({ message: 'No body' }));
              console.error('[SPOTIFY DEBUG] Auto-Transfer Failed Reason:', errData);
            }
          } catch (err) {
            console.error('[SPOTIFY DEBUG] Auto-Transfer Network Error:', err);
          }
        }, 1000);
      });

      newPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('[SPOTIFY DEBUG] Device ID has gone offline', device_id);
      });

      newPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) {
          console.log('[SPOTIFY DEBUG] State Changed: NULL (likely no active playback)');
          return;
        }
        console.log('[SPOTIFY DEBUG] State Changed. Paused:', state.paused, 'Track:', state.track_window?.current_track?.name);
        setIsPlaying(!state.paused);
        setIsActive(true);
        const track = state.track_window.current_track;
        if (track) {
          const newTrack: SpotifyTrack = {
            name: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            albumArt: track.album.images[0].url,
            uri: track.uri,
          };
          setCurrentTrack(newTrack);
        }
      });

      // Error listeners
      newPlayer.addListener('initialization_error', ({ message }: { message: string }) => console.error('[SPOTIFY DEBUG] Initialization Error:', message));
      
      newPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('[SPOTIFY DEBUG] Authentication Error:', message);
        setIsTokenExpired(true);
      });
      
      newPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('[SPOTIFY DEBUG] Account Error:', message);
        setIsPremiumRequired(true);
      });
      
      newPlayer.addListener('playback_error', ({ message }: { message: string }) => console.error('[SPOTIFY DEBUG] Playback Error:', message));

      newPlayer.connect().then((success: boolean) => {
        if (success) {
          console.log('[SPOTIFY DEBUG] SDK Connected successfully! ✅');
        } else {
          console.error('[SPOTIFY DEBUG] SDK failed to connect ❌');
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
      // Use localPlayer (captured at effect time) not stale `player` state
      localPlayer?.disconnect();
    };
  }, [accessToken]);

  const togglePlay = () => player?.togglePlay();
  const nextTrack = () => player?.nextTrack();
  const previousTrack = () => player?.previousTrack();

  const transferPlayback = async () => {
    if (!deviceId || !accessToken) return;
    
    try {
      console.log('--- Spotify Transfer Debug ---');
      console.log('Device ID:', deviceId);
      console.log('Token Present:', !!accessToken);
      
      if (!accessToken) {
        throw new Error('Spotify Access Token is missing or empty');
      }

      const res = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
      });

      if (res.ok) {
        console.log('Spotify Transfer Successful: ✅');
        setIsActive(true);
      } else {
        const errorData = await res.json().catch(() => ({ message: 'No JSON body' }));
        console.error(`Spotify Transfer Failed (${res.status}):`, errorData);
      }
    } catch (err: any) {
      console.error('CRITICAL: Spotify Transfer Exception:', err.message || err);
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
        hasToken: !!accessToken,
        accessToken: accessToken || null,
        togglePlay,
        nextTrack,
        previousTrack,
        transferPlayback,
        isPremiumRequired,
        isTokenExpired
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
