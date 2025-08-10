'use client';

import * as THREE from 'three';
import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { followTarget } from '@/Utils/follow';

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

type ParticleSystemProps = {
  target?: React.RefObject<THREE.Object3D>;
  offset?: THREE.Vector3;
  duration?: number; // Duration in seconds
  delay?: number;
  position?: THREE.Vector3;
  direction?: THREE.Vector3;
  particleCount?: number;
  size?: number;
  speed?: number;
  maxDistance?: number;
  startColor?: THREE.ColorRepresentation;
  endColor?: THREE.ColorRepresentation;
  startOpacity?: number;
  endOpacity?: number;
  particleLife?: number;
  useWorldSpace?: boolean;
  texturePath: string;
//   emissions?: {
//     rateOverDistance: number;
//     rateOverTime?: number; // New property
//   };
};

export function ParticleSystem({
  target,
  offset = new THREE.Vector3(100, 0, 0),
  position = new THREE.Vector3(100, 0, 0),
  direction,
  particleCount = 50,
  size = 25,
  speed = 0.05,
  maxDistance = 3,
  startColor = 'orange',
  endColor = 'red',
  startOpacity = 1.0,
  endOpacity = 0.0,
  useWorldSpace = false,
  texturePath,
  particleLife = 3,
  duration = Infinity,
  delay = 0,
  // emissions,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  // const lastPosition = useRef(new THREE.Vector3());
  // const particlesToEmit = useRef(0);
  const texture = useTexture(texturePath);
  const elapsedTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const activeRef = useRef(true);

  // Particle state
  const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
  const lifetimes = useMemo(() => new Float32Array(particleCount), [particleCount]);
  const origins = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
  const velocities = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
  const alive = useMemo(() => new Array(particleCount).fill(false), [particleCount]);
  const nextSpawnIndex = useRef(0);
  
  // Spawn / respawn a particle in place
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function respawnParticle(i: number) {
    alive[i] = true;
    lifetimes[i] = 0;

    // Pick spawn position
    const spawnPos = new THREE.Vector3(
      (Math.random() * 2 - 1) * 0.1,
      (Math.random() * 2 - 1) * 0.1,
      (Math.random() * 2 - 1) * 0.1
    ).add(offset);

    if (useWorldSpace && pointsRef.current) {
      spawnPos.applyMatrix4(pointsRef.current.matrixWorld);
    }

    origins[i * 3 + 0] = spawnPos.x;
    origins[i * 3 + 1] = spawnPos.y;
    origins[i * 3 + 2] = spawnPos.z;

    positions[i * 3 + 0] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    // Velocity
    const dir = direction ?? new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    dir.normalize().multiplyScalar(speed + Math.random() * speed);

    velocities[i * 3 + 0] = dir.x;
    velocities[i * 3 + 1] = dir.y;
    velocities[i * 3 + 2] = dir.z;
  }

  const spawnNextParticle = useCallback(() => {
    const i = nextSpawnIndex.current;
    alive[i] = true;
    lifetimes[i] = 0;

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.02 + 0.01;

    velocities[i * 3 + 0] = Math.cos(angle) * speed;
    velocities[i * 3 + 1] = Math.random() * 0.02;
    velocities[i * 3 + 2] = Math.sin(angle) * speed;

    origins[i * 3 + 0] = 0;
    origins[i * 3 + 1] = 0;
    origins[i * 3 + 2] = 0;

    // move to next index
    nextSpawnIndex.current = (nextSpawnIndex.current + 1) % particleCount;
  }, [alive, lifetimes, velocities, origins, particleCount]);


  useEffect(() => {
  for (let i = 0; i < particleCount; i++) {
    spawnNextParticle();
  }
}, [particleCount, spawnNextParticle]);


  useEffect(() => {
    for (let i = 0; i < particleCount; i++) {
      const dir = direction ?? new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      )
        .normalize()
        .multiplyScalar(speed + Math.random() * speed);
      velocities[i * 3 + 0] = dir.x;
      velocities[i * 3 + 1] = dir.y;
      velocities[i * 3 + 2] = dir.z;
    }
  }, [direction, particleCount, speed, velocities]);


  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
    return geo;
  }, [positions, lifetimes]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          size: { value: size },
          pointTexture: { value: texture },
          color: { value: new THREE.Color(startColor) }, // optional legacy fallback
          startColor: { value: new THREE.Color(startColor) },
          endColor: { value: new THREE.Color(endColor) },
          startOpacity: { value: startOpacity },
          endOpacity: { value: endOpacity },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [texture, size, startColor, endColor, startOpacity, endOpacity],
  );

  useEffect(() => {
    const baseMatrix = new THREE.Matrix4();
    if (pointsRef.current && useWorldSpace) {
      pointsRef.current.updateMatrixWorld();
      baseMatrix.copy(pointsRef.current.matrixWorld);
    }

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() * 2 - 1) * .1;
      const y = (Math.random() * 2 - 1) * .1;
      const z = (Math.random() * 2 - 1) * .1;

      const localPos = new THREE.Vector3(x, y, z).add(offset);
      const worldPos = localPos.clone();

      if (useWorldSpace) {
        worldPos.applyMatrix4(baseMatrix);
      }

      origins[i * 3 + 0] = worldPos.x;
      origins[i * 3 + 1] = worldPos.y;
      origins[i * 3 + 2] = worldPos.z;

      positions[i * 3 + 0] = 0; // Start at origin
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }
  }, [offset, origins, particleCount, positions, useWorldSpace]);
  // clean up geometries
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      texture.dispose?.(); // If it's a unique texture, dispose it too
    };
  }, [geometry, material, texture]);

  function animateParticles({
      geometry,
      positions,
      velocities,
      lifetimes,
      origins ,
      useWorldSpace,
      delta,
  }: { 
    geometry: THREE.BufferGeometry, 
    positions: Float32Array<ArrayBuffer>,
    velocities: Float32Array<ArrayBuffer>,
    lifetimes: Float32Array<ArrayBuffer>,
    useWorldSpace?: boolean,
    origins: Float32Array<ArrayBuffer>,
    delta: number
  }) {

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const lifeAttr = geometry.getAttribute('aLifetime') as THREE.BufferAttribute;
    if (useWorldSpace) {
      for (let i = 0; i < particleCount; i++) {
        const ox = origins[i * 3 + 0];
        const oy = origins[i * 3 + 1];
        const oz = origins[i * 3 + 2];

        let dx = positions[i * 3 + 0];
        let dy = positions[i * 3 + 1];
        let dz = positions[i * 3 + 2];

        dx += velocities[i * 3 + 0];
        dy += velocities[i * 3 + 1];
        dz += velocities[i * 3 + 2];

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const x = ox + dx;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const y = oy + dy;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const z = oz + dz;

      //   const distSq = dx * dx + dy * dy + dz * dz;
      //   const lifetime = Math.sqrt(distSq) / maxDistance;

        if (!alive[i]) continue; // Skip unused slots

        lifetimes[i] += delta / particleLife; // Advance lifetime
        if (lifetimes[i] > 1.0) {
          alive[i] = false;
          spawnNextParticle();
          continue;
        }

        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist > maxDistance) {
          alive[i] = false;
          spawnNextParticle();
          continue;
        }


        // Store displacement only
        positions[i * 3 + 0] = dx;
        positions[i * 3 + 1] = dy;
        positions[i * 3 + 2] = dz;

        posAttr.setXYZ(i, ox + dx, oy + dy, oz + dz);
        lifeAttr.setX(i, lifetimes[i]);
      }
      
    } else {
      for (let i = 0; i < particleCount; i++) {
        let x = positions[i * 3 + 0];
        let y = positions[i * 3 + 1];
        let z = positions[i * 3 + 2];
  
        x += velocities[i * 3 + 0];
        y += velocities[i * 3 + 1];
        z += velocities[i * 3 + 2];
  
        // Reset if too far
        const distSq = x * x + y * y + z * z;
        // const maxDistSq = maxDistance * maxDistance;
        const dist = Math.sqrt(distSq);
        
        if (!alive[i]) continue; // Skip unused slots

        lifetimes[i] += delta / particleLife; // Advance lifetime
        if (lifetimes[i] > 1.0) {

          alive[i] = false;
          spawnNextParticle();
          continue;
        }

        if (dist > maxDistance) {
          alive[i] = false;
          spawnNextParticle();
          continue;
        }
        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
  
        posAttr.setXYZ(i, x, y, z);
        lifeAttr.setX(i, lifetimes[i]);
      }
    }

    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  }

  // Animate positions
  useFrame(({ clock }, delta) => {

    if (!activeRef.current) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime;
      return;
    }

    const elapsed = clock.elapsedTime - startTimeRef.current;

    if (elapsed < delay) return; // Wait until delay passes
    if (duration !== undefined && elapsed > delay + duration) return;

    elapsedTimeRef.current += delta;
    if (elapsedTimeRef.current >= duration) {
      activeRef.current = false;
      return;
    }


    if (!pointsRef.current) return;

    // --- NEW LOGIC: Update position if a target is provided ---
    if (target?.current) {
      followTarget({
        followerRef: pointsRef as React.RefObject<THREE.Object3D>,
        targetRef: target,
        offset
      })
    } else {
      // If no target, use the position prop. This is the original behavior.
      pointsRef.current.position.copy(position);
    }

    animateParticles({
      geometry,
      positions,
      velocities,
      lifetimes,
      origins,
      useWorldSpace,
      delta
    });
  });

  return <points position={position} ref={pointsRef} geometry={geometry} material={material} />;
}
