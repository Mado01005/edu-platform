'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpotify } from '@/context/SpotifyContext';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signIn } from 'next-auth/react';

// Error Boundary for the Music Player to prevent whole-app crashes
class SpotifyErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error('[SPOTIFY CRASH]:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90vw] md:w-[400px] z-[99999]">
          <div className="bg-[#0f0f13]/90 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2V15H6L11 19V5Z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-gray-400">Radio Unavailable</p>
            <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] mx-auto">The Spotify interface encountered a temporary hitch.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white transition-all uppercase tracking-widest">Restart Interface</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type ViewState = 'PLAYER' | 'LIBRARY' | 'PLAYLIST' | 'SEARCH';

const MusicPlayerContent = () => {
  const pathname = usePathname();
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    previousTrack,
    hasToken,
    accessToken,
    deviceId,
    isPremiumRequired,
    isTokenExpired,
    volume,
    setSpotifyVolume,
    isMuted,
    setIsMuted,
    spotifyFetch,
    playUri
  } = useSpotify();

  const [isMinimized, setIsMinimized] = useState(true);
  const [view, setView] = useState<ViewState>('PLAYER');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [socialActivities, setSocialActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Library Fetching
  const fetchLibrary = useCallback(async () => {
    if (!hasToken) return;
    setIsLoading(true);
    try {
      const data = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=50');
      if (data && data.items) setPlaylists(data.items);
    } catch (err) {
      console.error('Library fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hasToken, spotifyFetch]);

  // Playlist Items Fetching
  const fetchPlaylistTracks = useCallback(async (playlistId: string) => {
    setIsLoading(true);
    try {
      const data = await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`);
      if (data && data.items) setPlaylistTracks(data.items);
    } catch (err) {
      console.error('Tracks fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [spotifyFetch]);

  // Search Logic
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await spotifyFetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`);
      if (data && data.tracks) setSearchResults(data.tracks.items);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [spotifyFetch]);

  // Handle View Transitions
  const openLibrary = () => {
    setView('LIBRARY');
    if (playlists.length === 0) fetchLibrary();
  };

  const openPlaylist = (playlist: any) => {
    setSelectedPlaylist(playlist);
    setPlaylistTracks([]);
    setView('PLAYLIST');
    fetchPlaylistTracks(playlist.id);
  };

  const backToHome = () => setView('PLAYER');
  const backToLibrary = () => setView('LIBRARY');

  // Playback wrapper to handle 'no context'
  const safeTogglePlay = async () => {
    if (!currentTrack) {
      // Warm up the player if nothing is loaded
      await playUri();
    } else {
      togglePlay();
    }
  };

  const lastVolumeRef = useRef(volume);
  const toggleMute = async () => {
    if (!hasToken || isPremiumRequired) return;
    try {
      if (isMuted) {
        const restoreVolume = lastVolumeRef.current || 0.5;
        await setSpotifyVolume(restoreVolume);
        setIsMuted(false);
      } else {
        lastVolumeRef.current = volume;
        await setSpotifyVolume(0);
        setIsMuted(true);
      }
    } catch (err) {
      console.error('[SPOTIFY] Volume toggle exception:', err);
    }
  };

  /* ── Minimized State ── */
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-14 h-14 rounded-full bg-[#0F0F15]/90 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
        title="Open Spotify Player"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" className="text-[#1DB954] group-hover:scale-110 transition-transform">
          <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.675.466-1.026.25-2.887-1.764-6.522-2.162-10.803-1.18-.403.093-.807-.16-.897-.562-.092-.403.16-.807.562-.897 4.693-1.072 8.694-.616 11.913 1.35.352.216.464.675.251 1.039zm1.464-3.262c-.27.44-.846.58-1.286.31-3.303-2.03-8.34-2.617-12.246-1.432-.496.15-1.022-.13-1.17-.624-.15-.496.13-1.022.625-1.17 4.456-1.353 10.003-.703 13.787 1.625.44.27.58.847.31 1.287zm.126-3.41c-3.96-2.352-10.493-2.57-14.288-1.417-.607.185-1.246-.164-1.431-.772-.185-.607.164-1.246.772-1.43 4.38-1.33 11.58-1.07 16.14 1.64.545.324.723 1.033.4 1.579-.323.546-1.033.723-1.579.4z" />
        </svg>
        {isPlaying && <span className="absolute inset-0 rounded-full border-2 border-[#1DB954]/50 animate-ping" />}
        {hasToken && currentTrack?.albumArt && (
          <img src={currentTrack.albumArt} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    );
  }

  /* ── Main Container ── */
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[95vw] md:w-[420px] z-[99999] transition-all duration-500 animate-in fade-in slide-in-from-bottom-10">
      <div className="relative">
        <div className="bg-[#0f0f13]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,1)] overflow-hidden">

          {/* Header Controls */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
            <div className="flex gap-2">
              {view !== 'PLAYER' && (
                <button
                  onClick={view === 'PLAYLIST' ? backToLibrary : backToHome}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition-all active:scale-95"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                </button>
              )}
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 transition-all active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 12 0" /><path d="m6 15 12 0" /></svg>
            </button>
          </div>

          {!hasToken ? (
            /* ── Connect View ── */
            <div className="p-10 text-center space-y-6">
              <div className="w-16 h-16 bg-[#1DB954] rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(29,185,84,0.3)] rotate-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="black"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.306c-.215.353-.675.466-1.026.25-2.887-1.764-6.522-2.162-10.803-1.18-.403.093-.807-.16-.897-.562-.092-.403.16-.807.562-.897 4.693-1.072 8.694-.616 11.913 1.35.352.216.464.675.251 1.039zm1.464-3.262c-.27.44-.846.58-1.286.31-3.303-2.03-8.34-2.617-12.246-1.432-.496.15-1.022-.13-1.17-.624-.15-.496.13-1.022.625-1.17 4.456-1.353 10.003-.703 13.787 1.625.44.27.58.847.31 1.287zm.126-3.41c-3.96-2.352-10.493-2.57-14.288-1.417-.607.185-1.246-.164-1.431-.772-.185-.607.164-1.246.772-1.43 4.38-1.33 11.58-1.07 16.14 1.64.545.324.723 1.033.4 1.579-.323.546-1.033.723-1.579.4z" /></svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Music Required</h3>
                <p className="text-gray-500 text-sm">Connect your Spotify to enable the Study Radio.</p>
              </div>
              <button onClick={() => signIn('spotify')} className="w-full h-14 bg-white text-black font-black rounded-3xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl">
                Authorize Spotify
              </button>
            </div>
          ) : (
            <div className="pt-20 pb-10 px-8">
              {view === 'PLAYER' && (
                /* ── Home View ── */
                <div className="space-y-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative w-48 h-48 rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] group">
                      {currentTrack?.albumArt ? (
                        <Image src={currentTrack.albumArt} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-4xl">📻</div>
                      )}
                      {isPlaying && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="flex gap-1 items-end h-10">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`w-1.5 bg-[#1DB954] animate-music-bar-${i} rounded-full`} />)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 w-full max-w-[280px]">
                      <h2 className="text-lg font-black text-white truncate">{currentTrack?.name || 'Radio IDLE'}</h2>
                      <p className="text-gray-500 text-sm font-semibold truncate">{currentTrack?.artist || 'Ready to study?'}</p>
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex flex-col space-y-8">
                    <div className="flex items-center justify-between gap-4">
                      <button onClick={openLibrary} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                      </button>
                      <div className="flex items-center gap-6">
                        <button onClick={previousTrack} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                        </button>
                        <button onClick={safeTogglePlay} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all">
                          {isPlaying ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                          ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
                          )}
                        </button>
                        <button onClick={nextTrack} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z" /></svg>
                        </button>
                      </div>
                      <button onClick={() => setView('SEARCH')} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                      </button>
                    </div>

                    {/* Volume Slider Mock with Mute */}
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl">
                      <button onClick={toggleMute} className="text-white/50 hover:text-white">
                        {isMuted ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2V15H6L11 19V5Z" /><path d="M23 9L17 15" /><path d="M17 9L23 15" /></svg>
                        ) : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2V15H6L11 19V5Z" /><path d="M15.54 8.46A5 5 0 0 1 15.54 15.54" /><path d="M19.07 4.93A10 10 0 0 1 19.07 19.07" /></svg>}
                      </button>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {view === 'LIBRARY' && (
                /* ── Library View ── */
                <div className="space-y-6 animate-in slide-in-from-right-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">Your Library</h3>
                    {isLoading && <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />}
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-10">
                    {playlists.map((pl: any) => (
                      <button
                        key={pl.id}
                        onClick={() => openPlaylist(pl)}
                        className="group flex flex-col items-start gap-3 p-3 rounded-3xl bg-white/5 hover:bg-[#1DB954]/20 border border-white/5 transition-all text-left"
                      >
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-lg">
                          <img src={pl.images[0]?.url} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" alt="" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center text-black">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                          </div>
                        </div>
                        <div className="w-full">
                          <p className="text-[13px] font-black text-white truncate">{pl.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{pl.tracks?.total} Tracks</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {view === 'PLAYLIST' && selectedPlaylist && (
                /* ── Playlist Detail View ── */
                <div className="space-y-6 animate-in slide-in-from-right-10">
                  <div className="flex items-center gap-4">
                    <img src={selectedPlaylist.images[0]?.url} className="w-20 h-20 rounded-2xl shadow-xl" alt="" />
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-white truncate">{selectedPlaylist.name}</h3>
                      <button onClick={() => playUri(undefined, selectedPlaylist.uri)} className="mt-2 px-4 py-1.5 bg-[#1DB954] text-black text-[10px] font-black uppercase tracking-wider rounded-full hover:scale-105 transition-transform">
                        Play Playlist
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-10">
                    {playlistTracks.map((item: any, i) => {
                      const track = item.track;
                      if (!track) return null;
                      return (
                        <button
                          key={`${track.id}-${i}`}
                          onClick={() => playUri(track.uri, selectedPlaylist.uri)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left border border-white/0 hover:border-white/5"
                        >
                          <span className="text-[10px] font-bold text-gray-600 w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{track.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{track.artists.map((a: any) => a.name).join(', ')}</p>
                          </div>
                          {currentTrack?.uri === track.uri && isPlaying && (
                            <div className="w-4 h-4 bg-[#1DB954] rounded-full flex items-center justify-center animate-pulse">
                              <div className="w-2 h-2 bg-black rounded-full" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === 'SEARCH' && (
                /* ── Search View ── */
                <div className="space-y-6 animate-in slide-in-from-right-10">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for study music..."
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-12 text-white text-sm focus:outline-none focus:border-[#1DB954]/50 transition-all font-medium"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearch(e.target.value);
                      }}
                      autoFocus
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    {isLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />}
                  </div>

                  <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar pb-10">
                    {searchResults.length > 0 ? (
                      searchResults.map((track: any) => (
                        <button
                          key={track.id}
                          onClick={() => playUri(track.uri)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left"
                        >
                          <img src={track.album?.images[track.album?.images.length - 1]?.url} className="w-10 h-10 rounded-lg shadow-md" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{track.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{track.artists.map((a: any) => a.name).join(', ')}</p>
                          </div>
                        </button>
                      ))
                    ) : searchQuery && !isLoading ? (
                      <p className="text-center text-gray-500 text-xs py-10 font-bold uppercase tracking-widest text-[#1DB954]">No results found</p>
                    ) : (
                      <div className="text-center space-y-2 py-10">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/20">Discovery Mode</p>
                        <p className="text-[10px] text-gray-600 font-medium">Search for songs to play them instantly.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Marquee Social Activity Bar */}
      {socialActivities.length > 0 && view === 'PLAYER' && !isMinimized && (
        <div className="absolute -bottom-10 left-10 right-10 h-8 bg-black/40 backdrop-blur-md rounded-full border border-white/5 flex items-center overflow-hidden z-0">
          <div className="flex animate-marquee gap-10 whitespace-nowrap items-center px-4">
            {socialActivities.map((act, i) => (
              <span key={i} className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/60 flex items-center gap-2">
                <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                {act.userName} is listening to {act.trackName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MusicPlayer = () => {
  return (
    <SpotifyErrorBoundary>
      <MusicPlayerContent />
    </SpotifyErrorBoundary>
  );
};

export default MusicPlayer;
