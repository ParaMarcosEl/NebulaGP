'use client';
// components/SpeedPad.tsx
import { useRef } from 'react';
import { useSpeedPadController } from '@/Components/SpeedPad/SpeedPadController';
import * as THREE from 'three';

type SpeedPadProps = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
};

export default function SpeedPad({ position, quaternion, playerRefs }: SpeedPadProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Hook into the SpeedPadController logic
  const speedPad = useSpeedPadController({
    playerRefs,
    speedPadRef: meshRef as React.RefObject<THREE.Mesh>,
    cooldownTime: 2,
  });

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      <coneGeometry args={[5, 10, 6]} />
      <meshStandardMaterial
        color={!speedPad.current.didPass ? 'lime' : 'lightblue'}
        emissive={!speedPad.current.didPass ? 'green' : 'darkgrey'}
        emissiveIntensity={1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
