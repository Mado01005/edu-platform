'use client';

import { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'square' | 'circle' | 'star' | 'triangle';
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#FFD93D', '#6C5CE7', '#A8E6CF',
  '#FF85A2', '#00B894', '#FDCB6E', '#E17055',
  '#81ECEC', '#DFE6E9', '#FD79A8', '#55EFC4',
];

export default function ConfettiCelebration({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 150; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 4 + Math.random() * 12;
      newParticles.push({
        id: i,
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight / 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 5 + Math.random() * 10,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 8 },
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        shape: (['square', 'circle', 'star', 'triangle'] as const)[Math.floor(Math.random() * 4)],
      });
    }
    return newParticles;
  }, []);

  useEffect(() => {
    if (!trigger) return;
    setIsActive(true);
    setParticles(createParticles());

    const timer = setTimeout(() => setIsActive(false), 4000);
    return () => clearTimeout(timer);
  }, [trigger, createParticles]);

  useEffect(() => {
    if (!isActive || particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.velocity.x,
          y: p.y + p.velocity.y,
          velocity: { x: p.velocity.x * 0.98, y: p.velocity.y + 0.25 },
          rotation: p.rotation + p.rotationSpeed,
          opacity: Math.max(0, p.opacity - 0.008),
        }));
        if (updated.every(p => p.opacity <= 0)) {
          setIsActive(false);
          return [];
        }
        return updated;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isActive, particles.length]);

  if (!isActive) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.shape !== 'star' ? p.color : 'transparent',
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'triangle' ? '0' : '2px',
              transform: `rotate(${p.rotation}deg)`,
              opacity: p.opacity,
              borderLeft: p.shape === 'triangle' ? `${p.size/2}px solid transparent` : undefined,
              borderRight: p.shape === 'triangle' ? `${p.size/2}px solid transparent` : undefined,
              borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : undefined,
              background: p.shape === 'star' ? undefined : p.color,
              boxShadow: `0 0 ${p.size}px ${p.color}40`,
            }}
          />
        ))}
      </div>
      {/* Celebration overlay text */}
      <div className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center">
        <div className="text-center animate-bounce-slow">
          <div className="text-6xl md:text-8xl mb-4">🎉</div>
          <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
            Subject Complete!
          </h2>
          <p className="text-lg text-gray-300 mt-2 font-medium">You&apos;re a legend. Keep going! 🚀</p>
        </div>
      </div>
    </>
  );
}
