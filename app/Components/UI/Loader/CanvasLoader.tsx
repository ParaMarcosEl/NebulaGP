// CanvasLoader.tsx
import { useGameStore } from '@/Controllers/Game/GameController';
import { useProgress } from '@react-three/drei';
import { Spinner } from './Spinner';

// CanvasLoader component to show loading progress
export const useCanvasLoader = () => {
  const { active, progress: dreiProgress } = useProgress(); // drieProgress for general assets
  const { MaterialLoaded, setMaterialLoaded } = useGameStore((s) => s);
  // Determine if the loader should be active
  // It's active if general assets are loading, OR
  // if terrain chunks are still building, OR
  // if the TerrainMaterial hasn't been reported as loaded yet.

  const isLoaderActive = active || !MaterialLoaded;

  return {
    isLoaderActive,
    setMaterialLoaded,
    loader: (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#111',
          color: '#fff',
          display: isLoaderActive ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          zIndex: 1000,
          borderRadius: '8px',
          fontFamily: 'Inter, sans-serif',
          gap: '10px',
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
