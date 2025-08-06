'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/Controllers/Game/GameController';

export function StartCountdown() {
  const [timeLeft, setTimeLeft] = useState(3); // Show 3 → 2 → 1 → GO!
  const [showGo, setShowGo] = useState(false);
  const raceStatus = useGameStore((s) => s.raceStatus);
  const setRaceStatus = useGameStore((s) => s.setRaceStatus);
  const didStart = useRef(false);

  useEffect(() => setRaceStatus('idle'), [setRaceStatus]);

  // Start countdown on 'countdown' status
  useEffect(() => {
    if (raceStatus !== 'countdown') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowGo(true);

          setTimeout(() => {
            setShowGo(false);
            setRaceStatus('racing');
          }, 1000); // Show GO for 1s

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [raceStatus, setRaceStatus]);

  // Auto-trigger countdown from idle
  useEffect(() => {
    if (raceStatus === 'idle' && !didStart.current) {
      didStart.current = true;
      setRaceStatus('countdown');
    }
  }, [raceStatus, setRaceStatus]);

  if (raceStatus !== 'countdown' && !showGo) return null;

  return (
    <div
      style={{
        zIndex: 1,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '4rem',
        color: 'white',
        pointerEvents: 'none',
        textShadow: '0 0 10px #000',
      }}
    >
      {showGo ? 'GO!' : timeLeft}
    </div>
  );
}
