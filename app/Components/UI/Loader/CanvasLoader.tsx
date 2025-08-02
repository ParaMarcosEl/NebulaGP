// CanvasLoader.tsx
import { useProgress } from '@react-three/drei';
import { useGameStore } from '@/Controllers/GameController';

// CanvasLoader component to show loading progress
export const CanvasLoader = () => {
  const { active, progress: dreiProgress } = useProgress(); // drieProgress for general assets
  const { totalTerrainChunks, loadedTerrainChunks, litTerrainMaterialLoaded } = useGameStore(); // Terrain loading progress and new material status

  // Calculate terrain-specific progress
  const terrainProgress = totalTerrainChunks > 0
    ? (loadedTerrainChunks / totalTerrainChunks) * 100
    : 0;

  // Determine if the loader should be active
  // It's active if general assets are loading, OR
  // if terrain chunks are still building, OR
  // if the LitTerrainMaterial hasn't been reported as loaded yet.
  const isLoaderActive = 
    active 
    || (totalTerrainChunks > loadedTerrainChunks) 
    || !litTerrainMaterialLoaded;

  return (
    <div
      style={{
        position: 'absolute',
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
        gap: '10px'
      }}
    >
      <p>Loading Scene Assets: {Math.floor(dreiProgress)}%</p>
      {totalTerrainChunks > 0 && (
        <p>Building Terrain: {Math.floor(terrainProgress)}%</p>
      )}
      {!litTerrainMaterialLoaded && (
        <p>Compiling Terrain Shaders...</p> 
      )}
      {!isLoaderActive && (
        <p>Loading Complete!</p>
      )}
    </div>
  );
};