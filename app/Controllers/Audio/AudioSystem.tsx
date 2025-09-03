// AudioSystem.tsx
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useAudioStore } from './useAudioStore';

export function useAudioListener() {
  const { camera } = useThree();
  const { setListener } = useAudioStore((s) => s);

  useEffect(() => {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    setListener(listener);

    return () => {
      camera.remove(listener);
    };
  }, [camera, setListener]);

  return null;
}
