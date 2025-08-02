import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

type BulletProps = {
  active: boolean;
  initialPosition: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  radius?: number;
  color?: string;
  maxDistance: number;
  onDeactivate: () => void;
};

export default function Bullet({
  active,
  initialPosition,
  direction,
  speed,
  radius = 0.1,
  color = 'hotpink',
  maxDistance,
  onDeactivate,
}: BulletProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentPos = useRef(new THREE.Vector3());
  const startPos = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());

  // Sync new values on activation
  useEffect(() => {
    if (active) {
      currentPos.current.copy(initialPosition);
      startPos.current.copy(initialPosition);
      dir.current.copy(direction).normalize();

      if (meshRef.current) {
        meshRef.current.position.copy(initialPosition);
      }
    }
  }, [active, initialPosition, direction]);

  useFrame((_, delta) => {
    if (!active || !meshRef.current) return;

    const movement = dir.current.clone().multiplyScalar(speed * delta);
    currentPos.current.add(movement);
    meshRef.current.position.copy(currentPos.current);

    if (currentPos.current.distanceTo(startPos.current) > maxDistance) {
      onDeactivate();
    }
  });

  return active ? (
    <Sphere ref={meshRef} args={[radius, 16, 16]}>
      <meshStandardMaterial color={color} />
    </Sphere>
  ) : null;
}
