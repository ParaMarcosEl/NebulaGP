'use client';
// components/WeaponPad.tsx
import { useRef } from 'react';
import { useShieldPadController } from './ShieldPadController';
import * as THREE from 'three';

type ShieldPadProps = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
};

export default function ShieldPad({ position, quaternion, playerRefs }: ShieldPadProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Hook into the WeaponPadController logic
  const WeaponPad = useShieldPadController({
    playerRefs,
    shieldPadRef: meshRef as React.RefObject<THREE.Mesh>,
    cooldownTime: 2,
  });

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      <boxGeometry args={[5, 5, 5]} />
      <meshStandardMaterial
        color={!WeaponPad.current.didPass ? 'blue' : 'white'}
        emissive={!WeaponPad.current.didPass ? 'blue' : 'darkgrey'}
        emissiveIntensity={1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
