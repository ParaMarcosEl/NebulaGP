'use client';

import { forwardRef } from 'react';
import * as THREE from 'three';
import { RigidBody, CapsuleCollider, CuboidCollider, BallCollider } from '@react-three/rapier';

type ObstacleProps = {
  position: [number, number, number];
  type?: 'capsule' | 'box' | 'sphere'; // allow more types if needed
};

const Obstacle = forwardRef<THREE.Mesh, ObstacleProps>(({ position, type = 'capsule' }, ref) => {
  let geometry;

  switch (type) {
    case 'capsule':
      geometry = <capsuleGeometry args={[1, 2]} />; // radius, length
      break;
    case 'box':
      geometry = <boxGeometry args={[2, 2, 2]} />;
      break;
    case 'sphere':
      geometry = <sphereGeometry args={[1, 32, 32]} />;
      break;
    default:
      geometry = <boxGeometry args={[2, 2, 2]} />;
  }

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <mesh ref={ref}>
        {geometry}
        <meshStandardMaterial color="red" />
      </mesh>
      {/* Collider needs to match the shape */}
      {type === 'capsule' && <CapsuleCollider args={[1, 2]} />} {/* radius, height */}
      {type === 'box' && <CuboidCollider args={[1, 1, 1]} />} {/* half extents */}
      {type === 'sphere' && <BallCollider args={[1]} />} {/* radius */}
    </RigidBody>
  );
});

Obstacle.displayName = 'Obstacle';

export default Obstacle;
