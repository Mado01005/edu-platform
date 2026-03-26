'use client';

import React, { useEffect, useState } from 'react';
import { useSpotify } from '@/context/SpotifyContext';
import Image from 'next/image';

const SpotifyPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, previousTrack, isActive } = useSpotify();
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

  if (!isActive || !currentTrack) return null;

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
