'use client';
// components/WeaponPad.tsx
import { useRef } from 'react';
import { useWeaponsPad } from '@/Components/Pad/usePadController';
import * as THREE from 'three';

type WeaponPadProps = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
};

export default function WeaponPad({ position, quaternion, playerRefs }: WeaponPadProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Hook into the WeaponPadController logic
  const WeaponPad = useWeaponsPad(
    playerRefs,
    meshRef as React.RefObject<THREE.Mesh>,
    2
  );

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      <boxGeometry args={[5, 5, 5]} />
      <meshStandardMaterial
        color={!WeaponPad.current.didPass ? 'orange' : 'white'}
        emissive={!WeaponPad.current.didPass ? 'orange' : 'darkgrey'}
        emissiveIntensity={1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
