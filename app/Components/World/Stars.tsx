// Components/World/Stars.tsx
'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';

interface StarsProps {
  count?: number;
  radius?: number;
  size?: number;
  rotationSpeed?: number;
  texturePath?: string; // path to custom texture
  color?: string;
  opacity?: number;
}

export default function Stars({
  count = 2000,
  radius = 800,
  size = 1.5,
  rotationSpeed = 0.0,
  texturePath = '/textures/particleDot512.png',
  color = '#ffffff',
  opacity = 0.9,
}: StarsProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // ✅ Load texture
  const texture = useLoader(THREE.TextureLoader, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  // Generate star positions
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * Math.sqrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pos.set([x, y, z], i * 3);
    }
    return pos;
  }, [count, radius]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  const material = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      map: texture,
      color,
      size,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return mat;
  }, [texture, color, size, opacity]);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
