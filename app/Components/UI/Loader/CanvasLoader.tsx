import { useState, useEffect } from 'react';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useProgress } from '@react-three/drei';
import { Spinner } from './Spinner';
import './CanvasLoader.css';

export const useCanvasLoader = () => {
  const { active, progress: dreiProgress } = useProgress();
  const { MaterialLoaded, setMaterialLoaded } = useGameStore((s) => s);

  const [visible, setVisible] = useState(true);

  const isLoaderActive = active || !MaterialLoaded;

  useEffect(() => {
    if (!isLoaderActive) {
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    } else {
      setVisible(true);
    }
  }, [isLoaderActive]);

  return {
    isLoaderActive,
    setMaterialLoaded,
    loader: visible && (
      <div className={`loader-overlay ${!isLoaderActive ? 'hidden' : ''}`}>
        {active && <p>Loading Scene Assets: {Math.floor(dreiProgress)}%</p>}
        <Spinner />
        {!MaterialLoaded && <p>Compiling Terrain...</p>}
        {!isLoaderActive && <p>Loading Complete!</p>}
      </div>
    ),
  };
};
