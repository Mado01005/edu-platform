'use client';

import React, { useEffect, useState } from 'react';
import { useSpotify } from '@/context/SpotifyContext';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signIn } from 'next-auth/react';

const MusicPlayer = () => {
  const pathname = usePathname();
  const { currentTrack, isPlaying, togglePlay, nextTrack, previousTrack, isActive, hasToken, accessToken, deviceId } = useSpotify();
  
  console.log('Player Token State:', accessToken ? 'Token Exists' : 'Token is MISSING');
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Hide on public pages
  if (pathname === '/login' || pathname === '/') return null;
  const [lastLoggedTrack, setLastLoggedTrack] = useState<string | null>(null);

  // Telemetry Hook: Log when track changes
  useEffect(() => {
    if (currentTrack && currentTrack.uri !== lastLoggedTrack) {
      setLastLoggedTrack(currentTrack.uri);
      
      // Silently log to Supabase via our internal API
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PLAYED_SONG',
          details: {
            trackName: currentTrack.name,
            artist: currentTrack.artist,
            spotifyUri: currentTrack.uri
          }
        })
      }).catch(err => console.error('Spotify Telemetry Error:', err));
    }
  }, [currentTrack, lastLoggedTrack]);

  const handleActivate = () => {
    if (!deviceId || !accessToken) {
      console.warn('Cannot activate: Missing Device ID or Token', { deviceId, hasToken: !!accessToken });
      return;
    }

    console.log('Attempting Spotify Transfer to:', deviceId);
    
    fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false
      })
    })
    .then(res => {
      console.log('Spotify Transfer Status:', res.status);
      if (res.ok) {
        window.location.reload();
      }
    })
    .catch(err => console.error('Spotify Transfer Error:', err));
  };

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        isCollapsed ? 'w-16 h-16' : 'w-80'
      }`}
    >
      <div className="glass-card backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl relative group">
        {!hasToken ? (
          <div className="p-4 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.675.466-1.026.25-2.887-1.764-6.522-2.162-10.803-1.18-.403.093-.807-.16-.897-.562-.092-.403.16-.807.562-.897 4.693-1.072 8.694-.616 11.913 1.35.352.216.464.675.251 1.039zm1.464-3.262c-.27.44-.846.58-1.286.31-3.303-2.03-8.34-2.617-12.246-1.432-.496.15-1.022-.13-1.17-.624-.15-.496.13-1.022.625-1.17 4.456-1.353 10.003-.703 13.787 1.625.44.27.58.847.31 1.287zm.126-3.41c-3.96-2.352-10.493-2.57-14.288-1.417-.607.185-1.246-.164-1.431-.772-.185-.607.164-1.246.772-1.43 4.38-1.33 11.58-1.07 16.14 1.64.545.324.723 1.033.4 1.579-.323.546-1.033.723-1.579.4z"/></svg>
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-widest opacity-80">Connect your Music</p>
            <button 
              onClick={() => signIn('spotify')}
              className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-black py-2.5 rounded-xl transition-all scale-hover shadow-lg active:scale-95 text-sm"
            >
              Log in with Spotify
            </button>
          </div>
        ) : !isActive ? (
          <div className="p-5 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Player Ready</p>
              <p className="text-[10px] text-gray-400 font-medium">Click to transfer playback here</p>
            </div>
            <button 
              onClick={handleActivate}
              disabled={!deviceId}
              className={`px-6 py-2 text-white text-xs font-black rounded-full transition-all scale-hover shadow-xl active:scale-95 ${
                !deviceId ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {deviceId ? 'ACTIVATE NOW' : 'CAPTURING DEVICE...'}
            </button>
          </div>
        ) : (
          <div className="relative group/content">
            {/* Toggle Button */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
            >
              {isCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
              )}
            </button>

            {isCollapsed ? (
              <div 
                onClick={() => setIsCollapsed(false)}
                className="w-16 h-16 cursor-pointer relative hover:scale-105 transition-transform"
              >
                {currentTrack?.albumArt ? (
                  <Image src={currentTrack.albumArt} alt="Art" fill className="object-cover animate-pulse-slow" />
                ) : (
                  <div className="w-full h-full bg-white/5" />
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-white/5">
                    {currentTrack?.albumArt && (
                      <Image src={currentTrack.albumArt} alt="Art" fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 pr-6">
                    <h4 className="text-[13px] font-bold text-white truncate leading-tight tracking-tight">
                      {currentTrack?.name || 'No Track Selected'}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5 tracking-wide">
                      {currentTrack?.artist || 'Open Spotify to play music'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 py-1">
                  <button onClick={previousTrack} className="text-gray-400 hover:text-white transition-all transform hover:scale-110 active:scale-90">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <button onClick={nextTrack} className="text-gray-400 hover:text-white transition-all transform hover:scale-110 active:scale-90">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
                  </button>
                </div>

                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-1000 shadow-[0_0_10px_white]" 
                    style={{ width: isPlaying ? '100%' : '0%' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPlayer;
