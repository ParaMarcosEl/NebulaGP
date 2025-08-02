import { useProgress } from '@react-three/drei';
import { useEffect } from 'react';

export function useSceneReady(onReady: () => void) {
  const { active, progress } = useProgress();

  useEffect(() => {
    if (!active && progress === 100) {
      // Delay a tick to ensure render is flushed
      requestAnimationFrame(() => {
        onReady();
      });
    }
  }, [active, progress, onReady]);
}
