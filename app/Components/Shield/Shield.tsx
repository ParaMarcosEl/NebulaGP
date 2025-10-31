import { extend, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ShieldMaterial } from './ShieldMaterial';
import { ShieldSound } from '../Audio/ShieldSound';
import { useGameStore } from '@/Controllers/Game/GameController';

extend({ ShieldMaterial });

export function Shield({
  target,
  playerId,
}: {
  target?: React.RefObject<THREE.Object3D>;
  playerId: number;
}) {
  const shieldValue = useGameStore((s) => s.raceData[playerId].shieldValue);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<ShieldMaterial>(null);

  // Temporary vectors and quaternions for performance
  const desiredPosition = new THREE.Vector3();
  const desiredQuat = new THREE.Quaternion();

  useFrame((state, delta) => {
    if (target?.current && meshRef.current) {
      // --- 1. Compute target position & rotation
      target.current.getWorldPosition(desiredPosition);
      target.current.getWorldQuaternion(desiredQuat);

      // --- 2. Time-based smoothing
      const positionLag = 0.08; // seconds; smaller = snappier
      const rotationLag = 0.05;

      const positionAlpha = 1 - Math.exp(-delta / positionLag);
      const rotationAlpha = 1 - Math.exp(-delta / rotationLag);

      // --- 3. Smoothly update shield
      meshRef.current.position.lerp(desiredPosition, positionAlpha);
      meshRef.current.quaternion.slerp(desiredQuat, rotationAlpha);
    }

    // --- 4. Update material uniforms
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      matRef.current.uniforms.uShieldValue.value = shieldValue;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} scale={[1.5, 0.8, 1.5]}>
        <sphereGeometry args={[1.8, 5, 5]} />
        <primitive ref={matRef} object={new ShieldMaterial()} />
        <ShieldSound volume={shieldValue} />
      </mesh>
    </group>
  );
}
