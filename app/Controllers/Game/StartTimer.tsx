'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';

export function StartCountdown() {
  const [timeLeft, setTimeLeft] = useState(3); // Show 3 → 2 → 1 → GO!
  const [showGo, setShowGo] = useState(false);
  const { raceStatus, setRaceStatus, setLapStartTime }  = useGameStore((s) => s);
  const didStart = useRef(false);
  const { isLoaderActive } = useCanvasLoader();

  useEffect(() => setRaceStatus('idle'), [setRaceStatus]);

  // Start countdown on 'countdown' status
  useEffect(() => {
    if (raceStatus !== 'countdown' || isLoaderActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowGo(true);

          setTimeout(() => {
            setShowGo(false);

            const startTime = performance.now();
            setRaceStatus('racing');
            setLapStartTime(startTime);

            // also sync lapStartTime for all racers
            useGameStore.setState((state) => {
              const updatedRaceData = { ...state.raceData };
              Object.keys(updatedRaceData).forEach((id) => {
                updatedRaceData[+id] = {
                  ...updatedRaceData[+id],
                  lapStartTime: startTime,
                };
              });
              return { raceData: updatedRaceData };
            });
          }, 1000);


          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [raceStatus, setRaceStatus, isLoaderActive]);

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
