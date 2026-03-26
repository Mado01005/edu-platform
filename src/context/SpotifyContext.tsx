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
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export const SpotifyProvider = ({ children, accessToken }: { children: ReactNode; accessToken?: string }) => {
  const [player, setPlayer] = useState<any | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    window.onSpotifyWebPlaybackSDKReady = () => {
      const newPlayer = new (window.Spotify.Player as any)({
        name: 'EduPortal High-Fidelity Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 0.5,
      });

      newPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Player Ready with Device ID', device_id);
        setDeviceId(device_id);
      });

      newPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Device ID has gone offline', device_id);
      });

      newPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        setIsPlaying(!state.paused);
        setIsActive(true);

        const track = state.track_window.current_track;
        const newTrack: SpotifyTrack = {
          name: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          albumArt: track.album.images[0].url,
          uri: track.uri,
        };

        // If track changed, we will log this in the component level via useEffect to keep context clean
        setCurrentTrack(newTrack);
      });

      newPlayer.connect();
      setPlayer(newPlayer);
    };

    return () => {
      player?.disconnect();
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
        transferPlayback
      }}
    >
      <Script
        src="https://sdk.scdn.co/spotify-player.js"
        strategy="afterInteractive"
      />
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
