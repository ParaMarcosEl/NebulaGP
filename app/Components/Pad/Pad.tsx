'use client';
import * as THREE from 'three';
import React from 'react';
import { PadType } from './usePadControllerBatch';

type PadProps = {
  type: PadType;
  meshRef: React.RefObject<THREE.Mesh>;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  didPass: boolean;
};

export function Pad({ type, meshRef, position, quaternion, didPass }: PadProps) {
  const styleMap = {
    speed: { color: 'lime', emissive: 'green', geometry: <coneGeometry args={[5, 10, 6]} /> },
    cannon: { color: 'orange', emissive: 'orange', geometry: <boxGeometry args={[5, 5, 5]} /> },
    mine: { color: 'crimson', emissive: 'crimson', geometry: <boxGeometry args={[5, 5, 5]} /> },
    shield: { color: 'blue', emissive: 'blue', geometry: <boxGeometry args={[5, 5, 5]} /> },
  }[type];

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      {styleMap.geometry}
      <meshStandardMaterial
        color={!didPass ? styleMap.color : 'white'}
        emissive={!didPass ? styleMap.emissive : 'darkgrey'}
        emissiveIntensity={1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}
