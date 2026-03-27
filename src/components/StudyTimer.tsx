'use client';

import { useState, useEffect, useRef } from 'react';

export default function StudyTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load today's session count
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`pomodoro_${today}`);
    if (saved) setSessions(parseInt(saved));
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer done!
      if (!isBreak) {
        // Study session complete → start break
        const today = new Date().toISOString().split('T')[0];
        const newCount = sessions + 1;
        setSessions(newCount);
        localStorage.setItem(`pomodoro_${today}`, String(newCount));
        setIsBreak(true);
        setTimeLeft(5 * 60); // 5 min break
        setIsRunning(true);
      } else {
        // Break complete → ready for next study
        setIsBreak(false);
        setTimeLeft(25 * 60);
        setIsRunning(false);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, isBreak, sessions]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalTime = isBreak ? 5 * 60 : 25 * 60;
  const progressPct = ((totalTime - timeLeft) / totalTime) * 100;

  const toggleTimer = () => {
    const newState = !isRunning;
    setIsRunning(newState);
    
    // Feature 5: Sync with Spotify MusicPlayer
    window.dispatchEvent(new CustomEvent('study-timer-state', { 
      detail: { isRunning: newState } 
    }));
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(25 * 60);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-20 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center hover:scale-110 transition-transform border border-white/20"
        title="Study Timer"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isRunning && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-ping"></span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-20 z-50">
      <div className="bg-[#12121A]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] w-64">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {isBreak ? '☕ Break Time' : '📖 Focus Mode'}
          </h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Circular Progress */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="transparent"
              stroke={isBreak ? '#34d399' : '#818cf8'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPct / 100)}`}
              className="transition-all duration-1000"
              style={{ filter: `drop-shadow(0 0 8px ${isBreak ? '#34d39940' : '#818cf840'})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
              {isBreak ? 'Break' : 'Focus'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={toggleTimer}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              isRunning
                ? 'bg-white/10 text-white hover:bg-white/15'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={resetTimer}
            className="px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
          >
            Reset
          </button>
        </div>

        {/* Session Counter */}
        <div className="text-center text-xs text-gray-500">
          <span className="text-indigo-400 font-bold">{sessions}</span> session{sessions !== 1 ? 's' : ''} today
          {sessions >= 3 && <span className="ml-1">🔥</span>}
        </div>
      </div>
    </div>
  );
}
