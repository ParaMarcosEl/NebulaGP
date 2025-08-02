'use client';
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Points, PointMaterial } from '@react-three/drei';
import { Skybox } from '../../Skybox';

function GalaxyPoints() {
  const pointsRef = useRef<THREE.Points>(null);

  const stars = useMemo(() => {
    const particles = new Float32Array(3000 * 3);
    for (let i = 0; i < 1500; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 100;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      particles[i3] = radius * Math.sin(phi) * Math.cos(theta);
      particles[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particles[i3 + 2] = radius * Math.cos(phi);
    }
    return particles;
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <Points ref={pointsRef} positions={stars} stride={3} frustumCulled>
      <PointMaterial color="white" size={0.3} sizeAttenuation depthWrite={false} />
    </Points>
  );
}

export function GalaxyBackground() {
  return (
    <Canvas
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
        width: '100%',
        height: '100%',
      }}
      camera={{ position: [0, 0, 50], fov: 75 }}
    >
      <Skybox />
      <GalaxyPoints />
    </Canvas>
  );
}
