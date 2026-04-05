'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSpotify } from '@/context/SpotifyContext';

type TimerState = 'idle' | 'running' | 'paused' | 'completed';

interface FocusTimerProps {
  lessonId: string;
}

export default function FocusTimer({ lessonId }: FocusTimerProps) {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const { hasToken, isPlaying, playUri, togglePlay } = useSpotify();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Deep Work Dimming Overlay
  useEffect(() => {
    if (timerState === 'running') {
      document.body.classList.add('deep-work-active');
    } else {
      document.body.classList.remove('deep-work-active');
    }
    return () => document.body.classList.remove('deep-work-active');
  }, [timerState]);

  // Handle countdown
  useEffect(() => {
    if (timerState === 'running' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerState === 'running') {
      handleComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState, timeLeft]);

  // Helper formatting
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const syncFocusBackend = async (status: 'completed' | 'interrupted') => {
    try {
      await fetch('/api/student/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          duration_minutes: selectedMinutes,
          status
        })
      });
    } catch (err) {
      console.error('[FOCUS_TIMER] Failed to sync session:', err);
    }
  };

  const handleStart = () => {
    setTimerState('running');
    if (hasToken && !isPlaying) {
      // Optional: Pass a specific Deep Work playlist context URI
      playUri('spotify:playlist:37i9dQZF1DX8U76H9SBrpf'); // Study Beats or similar
    }
  };

  const handlePause = () => {
    setTimerState('paused');
    if (isPlaying) {
      togglePlay();
    }
  };

  const handleAbort = () => {
    syncFocusBackend('interrupted');
    setTimerState('idle');
    setTimeLeft(selectedMinutes * 60);
    if (isPlaying) {
      togglePlay();
    }
  };

  const handleComplete = () => {
    setTimerState('completed');
    syncFocusBackend('completed');
    if (isPlaying) {
      togglePlay(); // Pause when done
    }
  };

  // Reset after completion
  const handleReset = () => {
    setTimerState('idle');
    setTimeLeft(selectedMinutes * 60);
  };

  const changeDuration = (mins: number) => {
    if (timerState === 'idle') {
      setSelectedMinutes(mins);
      setTimeLeft(mins * 60);
    }
  };

  const isDeepWork = timerState === 'running';

  return (
    <>
      {/* Global CSS for Deep Work dimming */}
      <style dangerouslySetInnerHTML={{__html: `
        body.deep-work-active > div:first-child main {
          filter: brightness(0.6) contrast(1.1);
          transition: filter 1s ease-in-out;
        }
        body.deep-work-active {
          background-color: #000 !important;
        }
      `}} />

      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out ${isDeepWork ? 'scale-110 shadow-2xl' : 'scale-100'}`}>
        <div className={`
          relative overflow-hidden
          rounded-3xl border border-white/10
          backdrop-blur-xl
          ${isDeepWork ? 'bg-indigo-900/40 border-indigo-500/30' : 'bg-black/80'}
          p-6 flex flex-col items-center gap-4 w-72 shadow-[0_8px_30px_rgb(0,0,0,0.12)]
        `}>
          {/* Header */}
          <div className="w-full flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Binary Beats</span>
            <div className="flex gap-1 text-white/50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            </div>
          </div>

          {/* Configuration / Time */}
          {timerState === 'idle' && (
            <div className="flex gap-2 w-full mt-2">
              {[25, 45, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => changeDuration(mins)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${selectedMinutes === mins ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}

          {timerState === 'completed' ? (
            <div className="py-4 text-center animate-in fade-in zoom-in">
              <span className="text-4xl">🎉</span>
              <p className="text-white font-bold mt-2 text-sm uppercase tracking-widest">Focus Complete</p>
            </div>
          ) : (
            <div className="text-5xl font-black text-white tracking-widest my-2 tabular-nums">
              {formatTime(timeLeft)}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 w-full mt-2">
            {timerState === 'idle' && (
              <button 
                onClick={handleStart}
                className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                Enter Deep Work
              </button>
            )}

            {timerState === 'running' && (
              <>
                <button disabled className="w-full py-3 bg-indigo-500/10 text-indigo-400 font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  Focusing
                </button>
                <button 
                  onClick={handlePause}
                  className="px-4 py-3 bg-white/10 text-white font-black rounded-xl hover:bg-white/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                </button>
                <button 
                  onClick={handleAbort}
                  className="px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-black rounded-xl hover:bg-red-500/20 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </>
            )}

            {timerState === 'paused' && (
              <>
                <button 
                  onClick={handleStart}
                  className="flex-1 py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] transition-all"
                >
                  Resume
                </button>
                <button 
                  onClick={handleAbort}
                  className="px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-black rounded-xl hover:bg-red-500/20 transition-all"
                >
                  Stop
                </button>
              </>
            )}

            {timerState === 'completed' && (
              <button 
                onClick={handleReset}
                className="w-full py-3 bg-white/10 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/20 transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
