'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import Obstacle from './Obstacle';

export default function Obstacles({
  obstacleRefs,
}: {
  obstacleRefs: React.RefObject<THREE.Mesh>[];
}) {
  const positions = useMemo(
    () =>
      [
        [10, 0, -20],
        [-5, 2, -30],
        [0, -3, -50],
      ] as [number, number, number][],
    [],
  );

  return (
    <>
      {positions.map((pos, i) => (
        <Obstacle key={i} position={pos} ref={obstacleRefs[i]} />
      ))}
    </>
  );
}
