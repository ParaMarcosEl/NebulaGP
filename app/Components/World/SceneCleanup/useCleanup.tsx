import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export function useCleanup() {
  const { gl } = useThree();

  useEffect(() => {
    // This function will run when the component unmounts.
    return () => {
    //   gl.dispose();
    //   gl.forceContextLoss(); // Forcefully lose the context to ensure a clean slate
    //   console.log('WebGLRenderer disposed and context lost.');
    };
  }, [gl]);
}