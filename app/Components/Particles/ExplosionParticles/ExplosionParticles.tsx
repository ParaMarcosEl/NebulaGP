import * as THREE from 'three';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef
} from 'react';
import { useFrame } from '@react-three/fiber';

export type ExplosionHandle = {
  play: (pos: THREE.Vector3) => void;
};

type Props = {
  maxParticles?: number;
  lifetime?: number;
  baseSpeed?: number;
  particleSize?: number;
};

const ExplosionParticles = forwardRef<ExplosionHandle, Props>(
  (
    {
      maxParticles = 2000,
      lifetime = 2.0,
      baseSpeed = 20,
      particleSize = 10,
    },
    ref
  ) => {
    const pointsRef = useRef<THREE.Points>(null);

    // Store next free particle index
    const nextIndex = useRef(0);

    // Attributes we’ll update dynamically
    const spawnTimes = useRef<Float32Array>(new Float32Array(maxParticles));
    const positions = useRef<Float32Array>(new Float32Array(maxParticles * 3));
    const velocities = useRef<Float32Array>(new Float32Array(maxParticles * 3));
    const colors = useRef<Float32Array>(new Float32Array(maxParticles * 3));

    const geometry = useMemo(() => {
      const geo = new THREE.BufferGeometry();

      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(positions.current, 3)
      );
      geo.setAttribute(
        'velocity',
        new THREE.BufferAttribute(velocities.current, 3)
      );
      geo.setAttribute(
        'spawnTime',
        new THREE.BufferAttribute(spawnTimes.current, 1)
      );
      geo.setAttribute(
        'color',
        new THREE.BufferAttribute(colors.current, 3)
      );

      return geo;
    }, [maxParticles]);

    const material = useMemo(() => {
      return new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          lifetime: { value: lifetime },
          baseSpeed: { value: baseSpeed },
          particleSize: { value: particleSize }
        },
        vertexShader: `
          attribute vec3 velocity;
          attribute float spawnTime;
          attribute vec3 color;
          varying vec3 vColor;
          varying float vAlpha;

          uniform float time;
          uniform float lifetime;
          uniform float baseSpeed;
          uniform float particleSize;

          void main() {
            float age = (time - spawnTime) / lifetime;
            if (age < 0.0 || age > 1.0) {
              gl_Position = vec4(0.0);
              gl_PointSize = 0.0;
              vAlpha = 0.0;
              return;
            }

            vec3 displaced = position + velocity * age * baseSpeed;
            vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = particleSize * (1.0 - age) * (300.0 / -mvPosition.z);

            vColor = color;
            vAlpha = 1.0 - age;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            if (length(uv) > 0.5) discard;
            gl_FragColor = vec4(vColor, vAlpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
    }, [lifetime, baseSpeed, particleSize]);

    // Update time each frame
    useFrame(({ clock }) => {
      if (material) {
        material.uniforms.time.value = clock.getElapsedTime();
      }
    });

    // Expose play() to spawn bursts
    useImperativeHandle(ref, () => ({
      play: (pos: THREE.Vector3) => {
        const count = 50; // particles per burst
        for (let i = 0; i < count; i++) {
          const idx = nextIndex.current;
          nextIndex.current = (nextIndex.current + 1) % maxParticles;

          // Base position
          positions.current[idx * 3 + 0] = pos.x;
          positions.current[idx * 3 + 1] = pos.y;
          positions.current[idx * 3 + 2] = pos.z;

          // Random velocity
          const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          ).normalize();
          velocities.current[idx * 3 + 0] = dir.x;
          velocities.current[idx * 3 + 1] = dir.y;
          velocities.current[idx * 3 + 2] = dir.z;

          // Color
          const c = new THREE.Color().setHSL(Math.random() * 0.05, 1, 0.5);
          colors.current[idx * 3 + 0] = c.r;
          colors.current[idx * 3 + 1] = c.g;
          colors.current[idx * 3 + 2] = c.b;

          // Spawn time
          spawnTimes.current[idx] = material.uniforms.time.value;
        }

        // Flag attributes as updated
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.velocity.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.attributes.spawnTime.needsUpdate = true;
      }
    }));

    return (
      <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
    );
  }
);

ExplosionParticles.displayName = 'ExplosionParticles';
export default ExplosionParticles;
