import { useState, useEffect } from 'react';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useProgress } from '@react-three/drei';
import { Spinner } from './Spinner';

export const useCanvasLoader = () => {
  const { active, progress: dreiProgress } = useProgress();
  const { MaterialLoaded, setMaterialLoaded } = useGameStore((s) => s);

  const [visible, setVisible] = useState(true);

  // Loader is considered active if assets are loading or terrain shaders not compiled
  const isLoaderActive = active || !MaterialLoaded;

  // Smoothly hide loader when finished
  useEffect(() => {
    if (!isLoaderActive) {
      const timeout = setTimeout(() => setVisible(false), 300); // fade-out delay
      return () => clearTimeout(timeout);
    } else {
      setVisible(true);
    }
  }, [isLoaderActive]);

  return {
    isLoaderActive,
    setMaterialLoaded,
    loader: visible && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#111',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          zIndex: 1000,
          borderRadius: '8px',
          fontFamily: 'Inter, sans-serif',
          gap: '10px',
          transition: 'opacity 0.3s',
          opacity: isLoaderActive ? 1 : 0,
        }}
      >
        {active && <p>Loading Scene Assets: {Math.floor(dreiProgress)}%</p>}
        <Spinner />
        {!MaterialLoaded && <p>Compiling Terrain Shaders...</p>}
        {!isLoaderActive && <p>Loading Complete!</p>}
      </div>
    ),
  };
};
