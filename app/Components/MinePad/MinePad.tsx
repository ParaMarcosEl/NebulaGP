'use client';
// components/WeaponPad.tsx
import { useRef } from 'react';
import { useMinePad } from '@/Components/Pad/usePadController';
import * as THREE from 'three';

type MinePadProps = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
};

export default function MinePad({ position, quaternion, playerRefs }: MinePadProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Hook into the WeaponPadController logic
  const WeaponPad = useMinePad(
    playerRefs,
    meshRef as React.RefObject<THREE.Mesh>,
    2);

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      <boxGeometry args={[5, 5, 5]} />
      <meshStandardMaterial
        color={!WeaponPad.current.didPass ? 'crimson' : 'white'}
        emissive={!WeaponPad.current.didPass ? 'crimson' : 'darkgrey'}
        emissiveIntensity={1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
