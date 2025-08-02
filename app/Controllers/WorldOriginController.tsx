// hooks/useWorldOrigin.ts
import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

export function useWorldOrigin(chunkSize: number = 200) {
  const { camera } = useThree();
  const [origin, setOrigin] = useState(() => new THREE.Vector2(0, 0));
  const lastIndexRef = useRef(new THREE.Vector2(Infinity, Infinity));

  useFrame(() => {
    const pos = camera.position;
    const newIndex = new THREE.Vector2(
      Math.floor(pos.x / chunkSize),
      Math.floor(pos.z / chunkSize),
    );

    if (!newIndex.equals(lastIndexRef.current)) {
      lastIndexRef.current.copy(newIndex);
      setOrigin(new THREE.Vector2(newIndex.x * chunkSize, newIndex.y * chunkSize));
    }
  });

  return origin;
}
