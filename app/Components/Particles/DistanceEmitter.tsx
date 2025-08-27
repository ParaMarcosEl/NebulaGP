// EmitterParticleSystem.tsx
import * as THREE from 'three';
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';

// Defines the structure for a single particle's data.
interface Particle {
  // Current velocity of the particle.
  velocity: THREE.Vector3;
  // How long the particle will live before deactivating.
  lifetime: number;
  // Current age of the particle.
  age: number;
  // Transparency value (0.0 to 1.0) for fading.
  alpha: number;
  // Rotation angle for the particle sprite.
  rotation: number;
  // Current color of the particle.
  color: THREE.Color;
  // The color the particle starts with.
  startColor: THREE.Color;
  // The color the particle will fade to.
  endColor?: THREE.Color;
  // The fixed position of the particle in world space.
  worldPosition: THREE.Vector3;
}

// Defines the props for the EmitterParticleSystem component.
// interface EmitterParticleSystemProps {
//   // A reference to the object (e.g., the player ship) the emitter will follow.
//   target?: React.RefObject<THREE.Object3D>;
//   // The file path for the particle sprite texture.
//   texturePath: string;
//   // The maximum number of particles in the system.
//   count?: number;
//   // The size of each particle on the screen.
//   particleSize?: number;
//   // The local offset from the target's pivot point where particles are emitted (e.g., the thruster).
//   offset?: THREE.Vector3;
//   // The distance the emitter must travel before spawning a new particle.
//   emitDistance?: number;
//   // The rate at which particle velocity decreases over time.
//   damping?: number;
//   // The base lifetime of a particle.
//   lifetime?: number;
// }

// The main component for the particle system.
export const EmitterParticleSystem: React.FC<{
  // A reference to the object (e.g., the player ship) the emitter will follow.
  target?: React.RefObject<THREE.Object3D>;
  // The file path for the particle sprite texture.
  texturePath: string;
  // The maximum number of particles in the system.
  count?: number;
  // The size of each particle on the screen.
  particleSize?: number;
  // The local offset from the target's pivot point where particles are emitted (e.g., the thruster).
  offset?: THREE.Vector3;
  // The distance the emitter must travel before spawning a new particle.
  emitDistance?: number;
  // The rate at which particle velocity decreases over time.
  damping?: number;
  // The base lifetime of a particle.
  lifetime?: number;
}> = ({
  target,
  texturePath,
  count = 20,
  particleSize = 5,
  offset = new THREE.Vector3(0, 0.3, 0.5),
  emitDistance = 0.1,
  damping = 0.9,
  lifetime = 0.2,
}) => {
  // Ref to the group that will follow the target. It acts as the emitter.
  const groupRef = useRef<THREE.Group>(null);
  // Ref to the Three.js Points object that renders the particles.
  const pointsRef = useRef<THREE.Points>(null);

  // Stores the position of the emitter from the previous frame to calculate distance traveled.
  const lastEmitterPos = useRef(new THREE.Vector3());
  // Accumulates the distance traveled by the emitter.
  const distanceAccumulator = useRef(0);

  // An array to hold the particle data objects.
  const particles = useRef<Particle[]>([]);
  // Typed arrays for particle attributes, optimized for GPU.
  const positions = useRef<Float32Array>(new Float32Array(count * 3));
  const alphas = useRef<Float32Array>(new Float32Array(count));
  const colors = useRef<Float32Array>(new Float32Array(count * 3));
  const rotations = useRef<Float32Array>(new Float32Array(count));

  // Loads the texture for the particles using useLoader.
  const texture = useLoader(THREE.TextureLoader, texturePath);

  // Initializes the particles array once on component mount.
  useEffect(() => {
    particles.current = new Array(count).fill(null).map(() => ({
      velocity: new THREE.Vector3(),
      // Randomizes lifetime slightly for a more natural look.
      lifetime: 0.5 + Math.random() * 0.5,
      // Sets age to Infinity to mark the particle as inactive initially.
      age: Infinity,
      alpha: 0,
      rotation: Math.random() * Math.PI * 2,
      color: new THREE.Color(),
      startColor: new THREE.Color(0xffaa00),
      endColor: new THREE.Color(0x222222),
      worldPosition: new THREE.Vector3(),
    }));
  }, [count]);

  // This hook runs every frame to update the particle system.
  useFrame((_, delta) => {
    // Check if the target and emitter group are available.
    if (target?.current && groupRef.current) {
      // Get the world position and orientation of the target.
      const shipQuat = target.current.quaternion.clone();
      // Transform local offset into world space
      const localOffset = offset.clone().applyQuaternion(shipQuat);

      target.current.getWorldPosition(groupRef.current.position);
      target.current.getWorldQuaternion(groupRef.current.quaternion);

      // Create a new vector for the current world position of the emitter.
      const currentPos = new THREE.Vector3();
      // Get the world position of the group (the emitter).
      groupRef.current.getWorldPosition(currentPos);
      // Add the local offset to get the final emission point.
      currentPos.add(localOffset);

      // Check if this is not the first frame.
      if (lastEmitterPos.current.lengthSq() > 0) {
        // Accumulate distance to control emission frequency.
        distanceAccumulator.current += currentPos.distanceTo(lastEmitterPos.current);
      }
      // Update the last position for the next frame's calculation.
      lastEmitterPos.current.copy(currentPos);

      // Get the forward direction of the target.
      const forward = new THREE.Vector3();
      target.current.getWorldDirection(forward);
      // Calculate the backward direction for the thruster effect.
      const backward = forward.clone().negate().normalize();

      // Emit particles as long as the accumulated distance is enough.
      while (distanceAccumulator.current >= emitDistance) {
        // Find an inactive particle to "reuse."
        const free = particles.current.find((p) => p.age > p.lifetime);
        if (free) {
          // "Activate" the particle by resetting its age.
          free.age = 0;
          free.lifetime = lifetime;

          // Set the particle's fixed world-space spawn position.
          const radius = 0.1; // tweak this for spread
          const angle = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * radius; // sqrt for uniform distribution

          // local offset in XY plane
          const localOffset = new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0);

          localOffset.applyQuaternion(groupRef.current.quaternion);

          free.worldPosition.copy(currentPos).add(localOffset);

          // Give the particle a velocity.
          const speed = 2;
          const jitter = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
          );
          free.velocity.copy(backward).multiplyScalar(speed).add(jitter);

          // add the target's current velocity
          if (target?.current?.userData.velocity) {
            free.velocity.add(target.current.userData.velocity);
          }

          free.alpha = 1;
          free.color.copy(free.startColor);
        }
        // Subtract the distance for the newly spawned particle.
        distanceAccumulator.current -= emitDistance;
      }
    }

    // Update particles' properties (position, color, alpha).
    particles.current.forEach((p, i) => {
      p.age += delta; // Increment the particle's age.
      if (p.age <= p.lifetime) {
        // Move the particle in world space based on its velocity.
        p.worldPosition.addScaledVector(p.velocity, delta);

        // Apply damping to the velocity.
        p.velocity.multiplyScalar(Math.exp(-damping * delta));

        // Calculate the fading alpha value based on age.
        const fadeAge = p.lifetime * 0.75;
        p.alpha = p.age > fadeAge ? 1 - (p.age - fadeAge) / (p.lifetime - fadeAge) : 1;
        // Interpolate the color.
        if (p.endColor) p.color.lerpColors(p.startColor, p.endColor, p.age / p.lifetime);

        // Update particle rotation.
        p.rotation += delta;
        if (p.rotation > Math.PI * 2) p.rotation -= Math.PI * 2;

        // Update the GPU attribute arrays with the particle's new data.
        positions.current[i * 3] = p.worldPosition.x;
        positions.current[i * 3 + 1] = p.worldPosition.y;
        positions.current[i * 3 + 2] = p.worldPosition.z;

        alphas.current[i] = p.alpha;
        colors.current.set([p.color.r, p.color.g, p.color.b], i * 3);
        rotations.current[i] = p.rotation;
      } else {
        // Set alpha to 0 for inactive particles to make them invisible.
        alphas.current[i] = 0;
      }
    });

    // Mark the geometry attributes as needing an update. This tells Three.js to send the new data to the GPU.
    const geo = pointsRef.current?.geometry as THREE.BufferGeometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.rotation.needsUpdate = true;
  });

  // UseMemo to create the BufferGeometry once.
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // Add the particle attributes to the geometry.
    geo.setAttribute('position', new THREE.BufferAttribute(positions.current, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas.current, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors.current, 3));
    geo.setAttribute('rotation', new THREE.BufferAttribute(rotations.current, 1));
    return geo;
  }, []);

  // UseMemo to create the ShaderMaterial once.
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { pointTexture: { value: texture } },
      vertexShader: `
        attribute float alpha;
        attribute vec3 color;
        attribute float rotation;
        varying float vAlpha;
        varying vec3 vColor;
        varying float vRotation;
        void main() {
          vAlpha = alpha;
          vColor = color;
          vRotation = rotation;
          // Transform the particle's world position into view space.
          vec4 mvPosition = viewMatrix * vec4(position, 1.0);
          // Calculate point size based on distance from the camera for perspective.
          gl_PointSize = ${particleSize.toFixed(1)} * (300.0 / -mvPosition.z);
          // Final projection to screen space.
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying float vAlpha;
        varying vec3 vColor;
        varying float vRotation;
        void main() {
          // Center the texture coordinates.
          vec2 uv = gl_PointCoord - 0.5;
          // Apply rotation to the texture coordinates.
          float c = cos(vRotation);
          float s = sin(vRotation);
          mat2 rot = mat2(c, -s, s, c);
          uv = rot * uv + 0.5;
          // Get the color from the texture.
          vec4 texColor = texture2D(pointTexture, uv);
          // Discard fully transparent pixels.
          if (texColor.a < 0.1) discard;
          // Final color with alpha and color blending.
          gl_FragColor = vec4(vColor, vAlpha) * texColor;
        }
      `,
      transparent: true,
      depthWrite: false, // Prevents depth-sorting issues.
      blending: THREE.AdditiveBlending, // Makes particles brighter when they overlap.
    });
  }, [texture, particleSize]);

  // Render the group that follows the target and the points object that renders the particles.
  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  );
};
