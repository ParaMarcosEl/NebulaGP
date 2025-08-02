'use client';

import { forwardRef } from 'react';
import * as THREE from 'three';

type ObstacleProps = {
  position: [number, number, number];
  type?: string;
};

const Obstacle = forwardRef<THREE.Mesh, ObstacleProps>(({ position, type = 'capsule' }, ref) => {
  let component;
  switch (type) {
    case 'capsule':
      component = <capsuleGeometry args={[2]} />;
  }
  return (
    <mesh ref={ref} position={position}>
      {component && component}
      <meshStandardMaterial color="red" />
    </mesh>
  );
});

// ✅ Add this line to satisfy ESLint
Obstacle.displayName = 'Obstacle';

export default Obstacle;
