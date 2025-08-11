'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Trail } from '@react-three/drei';

type SatelliteProps = {
  orbitRadius?: number;
  orbitSpeed?: number; // radians per second
  tilt?: number; // tilt in radians
  planetRef: React.RefObject<THREE.Object3D>;
  children: React.ReactNode;
  showTrail?: boolean;
  trailColor?: string;
  trailWidth?: number;
  trailLength?: number;
};

export default function Satellite({
  orbitRadius = 5,
  orbitSpeed = 0.5,
  tilt = 0,
  planetRef,
  children,
  showTrail = false,
  trailColor = 'white',
  trailWidth = 0.1,
  trailLength = 60,
}: SatelliteProps) {
  const satelliteRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);
  const position = new THREE.Vector3();
  const axisAngle = new THREE.Vector3(1, 0, 0);

  useFrame((_, delta) => {
    if (!planetRef.current || !satelliteRef.current) return;

    angleRef.current += orbitSpeed * delta;

    const x = orbitRadius * Math.cos(angleRef.current);
    const z = orbitRadius * Math.sin(angleRef.current);

    position.set(x, 0, z);
    position.applyAxisAngle(axisAngle, tilt);

    satelliteRef.current.position.copy(planetRef.current.position).add(position);
    satelliteRef.current.lookAt(planetRef.current.position);
  });

  return (
    <>
      <group position={satelliteRef?.current?.position} ref={satelliteRef}>
        {children}
        {showTrail && (
          <Trail
            width={trailWidth}
            length={trailLength}
            color={new THREE.Color(trailColor)}
            attenuation={(t) => t * t}
          >
            <mesh>
              <sphereGeometry args={[0.01]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </Trail>
        )}
      </group>
    </>
  );
}
