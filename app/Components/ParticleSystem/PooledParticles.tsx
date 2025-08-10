// src/game/particles/PooledParticles.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { EmitterConfig, ParticlePool } from './ParticlePool';

const vertexShader = `
  uniform float size;
  attribute float aLifetime;
  varying float vLifetime;

  void main() {
    vLifetime = aLifetime;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D pointTexture;
  uniform vec3 startColor;
  uniform vec3 endColor;
  uniform float startOpacity;
  uniform float endOpacity;
  varying float vLifetime;

  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    vec3 interpolatedColor = mix(startColor, endColor, vLifetime);
    float interpolatedOpacity = mix(startOpacity, endOpacity, vLifetime);
    gl_FragColor = vec4(interpolatedColor, interpolatedOpacity) * tex;
  }
`;

type PooledParticleSystemProps = {
    targetRef: React.RefObject<THREE.Object3D>;
    position?: THREE.Vector3;
  pool: ParticlePool;
  particlesPerEmitter?: number; // number of particles each emitter owns
  texturePath: string;
  size?: number;
  defaultSpeed?: number;
  defaultMaxDistance?: number;
  startColor?: THREE.ColorRepresentation;
  endColor?: THREE.ColorRepresentation;
  startOpacity?: number;
  endOpacity?: number;
};

export function PooledParticles({
    targetRef,
    // position,
  pool,
  particlesPerEmitter = 50,
  texturePath,
  size = 25,
  defaultSpeed = 0.05,
  defaultMaxDistance = 0.5,
  startColor = 'orange',
  endColor = 'red',
  startOpacity = 1.0,
  endOpacity = 0.0,
}: PooledParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
    const target = targetRef.current;
  const capacity = pool.capacity;
  const totalParticles = capacity * particlesPerEmitter;

  // Typed arrays shared across the entire pool:
  const particlePositions = useMemo(() => new Float32Array(totalParticles * 3), [totalParticles]);
  const particleLifetimes = useMemo(() => new Float32Array(totalParticles), [totalParticles]);
  const particleOrigins = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const particleVelocities = useMemo(() => new Float32Array(totalParticles * 3), [totalParticles]);

  const texture = useTexture(texturePath);

  // Initialize geometry & attributes (created once)
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // note: pass constructor args via args prop when using in JSX
    geo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    geo.setAttribute('aLifetime', new THREE.BufferAttribute(particleLifetimes, 1));
    // no index
    return geo;
  }, [particlePositions, particleLifetimes]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        size: { value: size },
        pointTexture: { value: texture },
        startColor: { value: new THREE.Color(startColor) },
        endColor: { value: new THREE.Color(endColor) },
        startOpacity: { value: startOpacity },
        endOpacity: { value: endOpacity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [texture, size, startColor, endColor, startOpacity, endOpacity]);

  // Clean up GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      // drei's useTexture may return shared textures; only dispose if you know it's unique.
      // texture.dispose?.();
    };
  }, [geometry, material, texture]);

  // Helper to (re)initialize a single emitter's origin & its particle particleVelocities
  const initEmitterAtIndex = (emitterIndex: number, cfg: EmitterConfig) => {
    const ox = target ? target.position.x : cfg.position[0];
    const oy = target ? target.position.y : cfg.position[1];
    const oz = target ? target.position.z : cfg.position[2];
    particleOrigins[emitterIndex * 3 + 0] = ox;
    particleOrigins[emitterIndex * 3 + 1] = oy;
    particleOrigins[emitterIndex * 3 + 2] = oz;

    const speed = cfg.speed ?? defaultSpeed;

    for (let p = 0; p < particlesPerEmitter; p++) {
      const pi = emitterIndex * particlesPerEmitter + p;
      // initial displacement at origin (0,0,0)
      particlePositions[pi * 3 + 0] = 0;
      particlePositions[pi * 3 + 1] = 0;
      particlePositions[pi * 3 + 2] = 0;
      particleLifetimes[pi] = 0;

      // random velocity (typed array)
      const rx = Math.random() * 2 - 1;
      const ry = Math.random() * 2 - 1;
      const rz = Math.random() * 2 - 1;
      // normalize
      const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
      const s = speed + Math.random() * speed;
      particleVelocities[pi * 3 + 0] = (rx / len) * s;
      particleVelocities[pi * 3 + 1] = (ry / len) * s;
      particleVelocities[pi * 3 + 2] = (rz / len) * s;
    }
  };

  // On spawn we should initialize particleOrigins/particleVelocities for that slot.
  // But spawn is done externally through pool.spawn(); here we observe active slots in update loop.

  // Animation loop
  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;

    // Read buffer attributes directly (these reference the same typed arrays)
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const lifeAttr = geometry.getAttribute('aLifetime') as THREE.BufferAttribute;

    for (let e = 0; e < capacity; e++) {
      if (!pool.isActive(e)) continue;
      const cfg = pool.getConfig(e);
      if (!cfg) continue;

      // initialize emitter if particleLifetimes for its particles are all zero (simple heuristic)
      // This ensures that the origin/particleVelocities are set once at first update after spawn
      const firstParticleIndex = e * particlesPerEmitter;
      if (particleLifetimes[firstParticleIndex] === 0 && particlePositions[firstParticleIndex * 3 + 0] === 0 && (now - (cfg.startTime ?? now)) < 1.0) {
        initEmitterAtIndex(e, cfg);
      }

      const ox = particleOrigins[e * 3 + 0];
      const oy = particleOrigins[e * 3 + 1];
      const oz = particleOrigins[e * 3 + 2];
      const maxDistance = cfg.maxDistance ?? defaultMaxDistance;
      const duration = cfg.duration ?? Infinity;
      const startTime = cfg.startTime ?? now;

      const elapsed = now - startTime;
      if (duration !== Infinity && elapsed > duration) {
        // emitter expired — release it and continue
        pool.release(e);
        // Optionally zero out its particles
        for (let p = 0; p < particlesPerEmitter; p++) {
          const pi = e * particlesPerEmitter + p;
          particlePositions[pi * 3 + 0] = 0;
          particlePositions[pi * 3 + 1] = 0;
          particlePositions[pi * 3 + 2] = 0;
          particleLifetimes[pi] = 0;
        }
        continue;
      }

      // update each particle in the emitter's range
      for (let p = 0; p < particlesPerEmitter; p++) {
        const pi = e * particlesPerEmitter + p;

        // displacement stored in particlePositions array
        let dx = particlePositions[pi * 3 + 0];
        let dy = particlePositions[pi * 3 + 1];
        let dz = particlePositions[pi * 3 + 2];

        // velocity components
        const vx = particleVelocities[pi * 3 + 0];
        const vy = particleVelocities[pi * 3 + 1];
        const vz = particleVelocities[pi * 3 + 2];

        dx += vx * delta;
        dy += vy * delta;
        dz += vz * delta;

        const distSq = dx * dx + dy * dy + dz * dz;
        const lifetime = Math.sqrt(distSq) / maxDistance;

        if (lifetime > 1.0) {
          // reset displacement to zero and re-randomize velocity
          dx = dy = dz = 0;

          const rx = Math.random() * 2 - 1;
          const ry = Math.random() * 2 - 1;
          const rz = Math.random() * 2 - 1;
          const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
          const speed = cfg.speed ?? defaultSpeed;
          const s = speed + Math.random() * speed;

          particleVelocities[pi * 3 + 0] = (rx / len) * s;
          particleVelocities[pi * 3 + 1] = (ry / len) * s;
          particleVelocities[pi * 3 + 2] = (rz / len) * s;
          particleLifetimes[pi] = 0;
        } else {
          particleLifetimes[pi] = lifetime;
        }

        // write back displacement
        particlePositions[pi * 3 + 0] = dx;
        particlePositions[pi * 3 + 1] = dy;
        particlePositions[pi * 3 + 2] = dz;

        // position in world space = origin + displacement
        posAttr.array[pi * 3 + 0] = ox + dx;
        posAttr.array[pi * 3 + 1] = oy + dy;
        posAttr.array[pi * 3 + 2] = oz + dz;

        lifeAttr.array[pi] = particleLifetimes[pi];
      } // particles loop
    } // emitters loop

    // Tell three.js to update GPU buffers
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}
