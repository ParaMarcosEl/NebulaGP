import * as THREE from 'three';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useRef, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useFrame, extend } from '@react-three/fiber';

type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
};

const MAX_PARTICLES = 20000;

export function ParticleSystem() {
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const particles: Particle[] = new Array(MAX_PARTICLES).fill(null).map(() => ({
    x: 0,
    y: 0,
    z: 0,
    vx: (Math.random() - 0.5) * 2,
    vy: Math.random() * 2,
    vz: (Math.random() - 0.5) * 2,
    life: 0,
    maxLife: 1 + Math.random() * 2,
  }));

  const geomRef = useRef<THREE.BufferGeometry>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame((_, dt) => {
    let i3 = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        // Respawn
        p.x = 0;
        p.y = 0;
        p.z = 0;
        p.vx = (Math.random() - 0.5) * 2;
        p.vy = Math.random() * 2;
        p.vz = (Math.random() - 0.5) * 2;
        p.life = 0;
        p.maxLife = 1 + Math.random() * 2;
      }
      // Update physics
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Write to positions array
      positions[i3++] = p.x;
      positions[i3++] = p.y;
      positions[i3++] = p.z;
    }

    // Update GPU
    geomRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={MAX_PARTICLES} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={`
          uniform float size;
          void main() {
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          void main() {
            float r = length(gl_PointCoord - 0.5);
            if (r > 0.5) discard;
            gl_FragColor = vec4(1.0); // white circle
          }
        `}
        uniforms={{ size: { value: 10 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
