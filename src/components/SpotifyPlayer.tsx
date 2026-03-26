'use client';

import React, { useEffect, useState } from 'react';
import { useSpotify } from '@/context/SpotifyContext';
import Image from 'next/image';
import { signIn } from 'next-auth/react';

const SpotifyPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, previousTrack, isActive, hasToken } = useSpotify();
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  // "Connect Spotify" Fallback UI
  if (!hasToken) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce-slow">
        <button 
          onClick={() => signIn('spotify')}
          className="flex items-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 px-6 rounded-full shadow-2xl transition-all scale-hover active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.675.466-1.026.25-2.887-1.764-6.522-2.162-10.803-1.18-.403.093-.807-.16-.897-.562-.092-.403.16-.807.562-.897 4.693-1.072 8.694-.616 11.913 1.35.352.216.464.675.251 1.039zm1.464-3.262c-.27.44-.846.58-1.286.31-3.303-2.03-8.34-2.617-12.246-1.432-.496.15-1.022-.13-1.17-.624-.15-.496.13-1.022.625-1.17 4.456-1.353 10.003-.703 13.787 1.625.44.27.58.847.31 1.287zm.126-3.41c-3.96-2.352-10.493-2.57-14.288-1.417-.607.185-1.246-.164-1.431-.772-.185-.607.164-1.246.772-1.43 4.38-1.33 11.58-1.07 16.14 1.64.545.324.723 1.033.4 1.579-.323.546-1.033.723-1.579.4z"/>
          </svg>
          Connect Spotify
        </button>
      </div>
    );
  }

  // If connected but nothing playing, show simplified search or "Start listening" hint
  if (!isActive || !currentTrack) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="glass-card flex items-center gap-3 p-4 shadow-2xl scale-hover cursor-pointer" onClick={() => window.open('https://open.spotify.com', '_blank')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <p className="text-sm font-bold text-white">Open Spotify to Play</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isCollapsed ? 'w-16 h-16' : 'w-72'
      }`}
    >
      <div className="glass-card overflow-hidden shadow-2xl relative group">
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-2 right-2 z-20 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
          )}
        </button>

        {isCollapsed ? (
          <div 
            onClick={() => setIsCollapsed(false)}
            className="w-full h-full cursor-pointer relative"
          >
            <Image 
              src={currentTrack.albumArt} 
              alt="Artwork" 
              fill 
              className="object-cover animate-pulse"
            />
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-lg">
                <Image 
                  src={currentTrack.albumArt} 
                  alt="Artwork" 
                  fill 
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{currentTrack.name}</h4>
                <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 py-2">
              <button onClick={previousTrack} className="text-gray-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all scale-hover active:scale-95"
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              <button onClick={nextTrack} className="text-gray-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
              </button>
            </div>
            
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000" 
                style={{ width: isPlaying ? '100% ' : '0%' }} // Note: Pure visual progress bar would need local intervals
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyPlayer;
