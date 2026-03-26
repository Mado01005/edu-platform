'use client';

import React, { useEffect, useState } from 'react';
import { useSpotify } from '@/context/SpotifyContext';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signIn } from 'next-auth/react';

const MusicPlayer = () => {
  const pathname = usePathname();
  const { currentTrack, isPlaying, togglePlay, nextTrack, previousTrack, isActive, hasToken, accessToken, deviceId } = useSpotify();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [socialActivities, setSocialActivities] = useState<any[]>([]);
  const [lastLoggedTrack, setLastLoggedTrack] = useState<string | null>(null);

  // Hide on public pages
  if (pathname === '/login' || pathname === '/') return null;

  // Fetch Social Activities
  useEffect(() => {
    const fetchSocial = async () => {
      try {
        const res = await fetch('/api/social/spotify');
        const data = await res.json();
        if (data.latestActivities) setSocialActivities(data.latestActivities);
      } catch (err) {
        console.error('Failed to fetch social activities');
      }
    };
    fetchSocial();
    const interval = setInterval(fetchSocial, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Playlists
  useEffect(() => {
    if (hasToken && accessToken && playlists.length === 0) {
      fetch('https://api.spotify.com/v1/me/playlists?limit=10', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.items) setPlaylists(data.items);
      })
      .catch(err => console.error('Failed to fetch playlists:', err));
    }
  }, [hasToken, accessToken, playlists.length]);

  // Smart-Pause Logic
  useEffect(() => {
    const handleMediaPlay = () => { if (isPlaying) togglePlay(); };
    const attachListeners = () => {
      document.querySelectorAll('video').forEach(v => {
        v.addEventListener('play', handleMediaPlay);
      });
    };
    attachListeners();
    const observer = new MutationObserver(attachListeners);
    observer.observe(document.body, { childList: true, subtree: true });
    
    const handleVimeo = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if ((data.event === 'play' || data.method === 'play') && isPlaying) togglePlay();
      } catch {}
    };
    window.addEventListener('message', handleVimeo);

    return () => {
      observer.disconnect();
      window.removeEventListener('message', handleVimeo);
    };
  }, [isPlaying, togglePlay]);

  // Telemetry
  useEffect(() => {
    if (currentTrack && currentTrack.uri !== lastLoggedTrack) {
      setLastLoggedTrack(currentTrack.uri);
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PLAYED_SONG',
          details: { trackName: currentTrack.name, artist: currentTrack.artist, spotifyUri: currentTrack.uri }
        })
      }).catch(() => {});
    }
  }, [currentTrack, lastLoggedTrack]);

  const playPlaylist = (uri: string) => {
    if (!deviceId || !accessToken) return;
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_uri: uri })
    }).then(() => setShowPlaylists(false));
  };

  return (
    <div className={`fixed z-[99999] transition-all duration-700 ease-out 
      ${isCollapsed ? 'bottom-4 left-4 w-16 h-16' : 'bottom-4 left-4 right-4 w-auto md:bottom-24 md:left-6 md:right-auto md:w-[350px]'}
    `}>
      <div className="relative group p-1">
        {/* Sleek Glass Container */}
        <div className="backdrop-blur-3xl bg-[#0F0F15]/80 border border-white/10 rounded-[28px] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] transition-all duration-500">
          
          {!hasToken ? (
             <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-[#1DB954] rounded-full mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(29,185,84,0.4)]">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.675.466-1.026.25-2.887-1.764-6.522-2.162-10.803-1.18-.403.093-.807-.16-.897-.562-.092-.403.16-.807.562-.897 4.693-1.072 8.694-.616 11.913 1.35.352.216.464.675.251 1.039zm1.464-3.262c-.27.44-.846.58-1.286.31-3.303-2.03-8.34-2.617-12.246-1.432-.496.15-1.022-.13-1.17-.624-.15-.496.13-1.022.625-1.17 4.456-1.353 10.003-.703 13.787 1.625.44.27.58.847.31 1.287zm.126-3.41c-3.96-2.352-10.493-2.57-14.288-1.417-.607.185-1.246-.164-1.431-.772-.185-.607.164-1.246.772-1.43 4.38-1.33 11.58-1.07 16.14 1.64.545.324.723 1.033.4 1.579-.323.546-1.033.723-1.579.4z"/></svg>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Music Offline</p>
                <button onClick={() => signIn('spotify')} className="w-full h-12 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">Connect Spotify</button>
             </div>
          ) : (
            <div className="relative">
              {/* Content Toggle */}
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-inner"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={isCollapsed ? "m15 18-6-6 6-6" : "m9 6 6 6-6 6"}/></svg>
              </button>

              {isCollapsed ? (
                <div onClick={() => setIsCollapsed(false)} className="w-16 h-16 cursor-pointer relative group/collapsed">
                  {currentTrack?.albumArt ? (
                    <Image src={currentTrack.albumArt} alt="" fill className="object-cover group-hover/collapsed:opacity-80 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-600/20"><span className="text-xl">🎵</span></div>
                  )}
                  {isPlaying && <div className="absolute inset-0 border-2 border-indigo-500 animate-pulse rounded-full m-1" />}
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {/* Track Info */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group-hover:rotate-1 transition-transform duration-500">
                      {currentTrack?.albumArt ? (
                        <Image src={currentTrack.albumArt} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">🎧</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-[15px] font-black text-white truncate pr-6">{currentTrack?.name || 'Nothing Playing'}</h4>
                      </div>
                      <p className="text-xs font-semibold text-gray-500 truncate">{currentTrack?.artist || 'EduPortal Radio'}</p>
                    </div>
                  </div>

                  {/* Social Feed (Integrated Sleekly) */}
                  {socialActivities.length > 0 && (
                    <div className="bg-white/[0.03] rounded-xl px-3 py-1.5 h-7 overflow-hidden border border-white/5 flex items-center">
                      <div className="flex animate-marquee gap-10 whitespace-nowrap items-center">
                        {socialActivities.map((act, i) => (
                          <span key={i} className="text-[9px] font-black uppercase tracking-widest text-indigo-400/80">
                             STUDYING NOW: {act.userName} • {act.trackName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Playback Controls */}
                  <div className="flex items-center justify-between px-2 gap-4">
                    <button onClick={() => setShowPlaylists(!showPlaylists)} className={`p-3 rounded-2xl transition-all ${showPlaylists ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                    </button>
                    <div className="flex items-center gap-6">
                      <button onClick={previousTrack} className="p-2 text-white/40 hover:text-white transition-all transform active:scale-90"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
                      <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">
                        {isPlaying ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>
                      <button onClick={nextTrack} className="p-2 text-white/40 hover:text-white transition-all transform active:scale-90"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg></button>
                    </div>
                    <div className="w-8 hidden md:block" />
                  </div>

                  {/* Playlist Dropdown (Opens Upward) */}
                  {showPlaylists && (
                    <div className="absolute bottom-full left-0 mb-2 max-h-48 overflow-y-auto z-[99999] bg-[#0F0F15]/95 backdrop-blur-3xl p-5 space-y-3 animate-in slide-in-from-bottom-5 duration-300 rounded-[28px] shadow-2xl border border-white/10 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Your Playlists</h3>
                        <button onClick={() => setShowPlaylists(false)} className="text-gray-500 hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </div>
                      <div className="grid gap-2">
                        {playlists.map((pl: any) => (
                          <button key={pl.id} onClick={() => playPlaylist(pl.uri)} className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left group/pl">
                            <img src={pl.images[0]?.url} className="w-10 h-10 rounded-xl shadow-lg" alt="" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                              <p className="text-[10px] text-gray-500 font-medium">Playlist • {pl.tracks.total} tracks</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
