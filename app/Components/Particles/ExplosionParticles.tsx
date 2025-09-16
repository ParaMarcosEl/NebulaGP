// MineExplosionParticles.tsx (Optimized)
import * as THREE from 'three';
import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';

export type MineExplosionHandle = {
  play: (position: THREE.Vector3) => void;
  isPlaying: () => boolean;
};

const MineExplosionParticles = forwardRef<
  MineExplosionHandle,
  {
    majorRadius?: number;
    minorRadius?: number;
    maxParticles?: number;
    particleSize?: number;
    speed?: number;
    lifetime?: number;
  }
>(
  (
    {
      majorRadius = 2,
      minorRadius = 0.5,
      maxParticles = 1000,
      particleSize = 2,
      speed = 1,
      lifetime = 3,
    },
    ref,
  ) => {
    const pointsRef = useRef<THREE.Points>(null);
    const startTime = useRef<number>(-9999);
    const isPlaying = useRef(false);

    const { geometry, material } = useMemo(() => {
      const positions = new Float32Array(maxParticles * 3);
      const colors = new Float32Array(maxParticles * 3);
      const sizes = new Float32Array(maxParticles);
      const initialOffsets = new Float32Array(maxParticles * 3);
      const speedFactors = new Float32Array(maxParticles);
      const rotationAxes = new Float32Array(maxParticles * 3);
      const rotationSpeeds = new Float32Array(maxParticles);

      for (let i = 0; i < maxParticles; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = (Math.random() - 0.5) * 2 * Math.PI;
        const density = Math.sqrt(Math.random());
        const r = minorRadius * density;

        const x = r * Math.cos(phi);
        const y = r * Math.sin(phi);
        const z = 0;

        initialOffsets[i * 3 + 0] = x;
        initialOffsets[i * 3 + 1] = y;
        initialOffsets[i * 3 + 2] = z;

        const mainX = majorRadius * Math.cos(theta);
        const mainY = 0;
        const mainZ = majorRadius * Math.sin(theta);

        positions[i * 3 + 0] = mainX;
        positions[i * 3 + 1] = mainY;
        positions[i * 3 + 2] = mainZ;

        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.05, 1, 0.5);
        colors[i * 3 + 0] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = particleSize;

        const distFromCenter = Math.sqrt(x * x + y * y + z * z);
        speedFactors[i] = 1.0 - distFromCenter / minorRadius;

        rotationAxes[i * 3 + 0] = Math.random() - 0.5;
        rotationAxes[i * 3 + 1] = Math.random() - 0.5;
        rotationAxes[i * 3 + 2] = Math.random() - 0.5;
        rotationSpeeds[i] = (Math.random() - 0.5) * 0.1;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('initialOffset', new THREE.BufferAttribute(initialOffsets, 3));
      geo.setAttribute('speedFactor', new THREE.BufferAttribute(speedFactors, 1));
      geo.setAttribute('rotationAxis', new THREE.BufferAttribute(rotationAxes, 3));
      geo.setAttribute('rotationSpeed', new THREE.BufferAttribute(rotationSpeeds, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0.0 },
          baseSpeed: { value: speed },
          lifetime: { value: lifetime },
          explosionStartTime: { value: -9999.0 },
        },
        vertexShader: `
          precision mediump float;
          attribute float size;
          attribute vec3 color;
          attribute vec3 initialOffset;
          attribute float speedFactor;
          attribute vec3 rotationAxis;
          attribute float rotationSpeed;

          varying vec3 vColor;
          varying float vAge;

          uniform float time;
          uniform float baseSpeed;
          uniform float lifetime;
          uniform float explosionStartTime;

          mat4 rotationMatrix(vec3 axis, float angle) {
            axis = normalize(axis);
            float s = sin(angle);
            float c = cos(angle);
            float oc = 1.0 - c;
            return mat4(
              oc * axis.x * axis.x + c,      oc * axis.x * axis.y - axis.z * s,   oc * axis.z * axis.x + axis.y * s,   0.0,
              oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c,      oc * axis.y * axis.z - axis.x * s,   0.0,
              oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s,   oc * axis.z * axis.z + c,      0.0,
              0.0,                   0.0,                     0.0,                     1.0
            );
          }

          void main() {
            vColor = color;
            float age = (time - explosionStartTime) / lifetime;
            vAge = clamp(1.0 - age, 0.0, 1.0);
            
            vec3 majorAxis = normalize(position);
            vec3 expandedPosition = majorAxis * age * baseSpeed * 10.0;
            mat4 rotation = rotationMatrix(rotationAxis, age * rotationSpeed);
            vec3 rotatedMinorOffset = (rotation * vec4(initialOffset, 1.0)).xyz;
            vec3 finalPosition = expandedPosition + rotatedMinorOffset;
            vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
            gl_PointSize = size * (1800.0 / (-mvPosition.z + 1e-6)) * vAge;

            if (age < 0.0 || age > 1.0) {
              gl_PointSize = 0.0;
            }

            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          precision mediump float;
          varying vec3 vColor;
          varying float vAge;
          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            if(length(uv) > 0.5) discard;
            gl_FragColor = vec4(vColor, vAge);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      return { geometry: geo, material: mat };
    }, [majorRadius, minorRadius, maxParticles, particleSize, speed, lifetime]);

    useImperativeHandle(ref, () => ({
      play: (pos: THREE.Vector3) => {
        if (!pointsRef.current || isPlaying.current) return;
        pointsRef.current.position.copy(pos);
        startTime.current = -9999;
        isPlaying.current = true;
      },
      isPlaying: () => isPlaying.current,
    }));

    useFrame(({ clock }) => {
      if (!isPlaying.current || !pointsRef.current) return;

      const t = clock.getElapsedTime();
      if (startTime.current === -9999) {
        startTime.current = t;
        material.uniforms.explosionStartTime.value = t;
      }
      
      material.uniforms.time.value = t;

      if (t - startTime.current > lifetime) {
        isPlaying.current = false;
        pointsRef.current.position.set(10000, 10000, 10000);
      }
    });

    return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
  },
);

export default MineExplosionParticles;
MineExplosionParticles.displayName = 'MineExplosionParticles';