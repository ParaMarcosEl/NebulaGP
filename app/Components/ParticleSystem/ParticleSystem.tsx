import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

const vertexShader = `
uniform float size;
uniform bool useWorldSpace;
attribute float aLifetime;
varying float vLifetime;

void main() {
  vLifetime = aLifetime;
  vec4 mvPosition = useWorldSpace
    ? vec4(position, 1.0)
    : modelViewMatrix * vec4(position, 1.0);

  gl_PointSize = size / -mvPosition.z;

  gl_Position = useWorldSpace
    ? projectionMatrix * viewMatrix * vec4(position, 1.0)
    : projectionMatrix * mvPosition;
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
  position?: THREE.Vector3;
  particleCount?: number;
  size?: number;
  speed?: number;
  maxDistance?: number;
  startColor?: THREE.ColorRepresentation;
  endColor?: THREE.ColorRepresentation;
  startOpacity?: number;
  endOpacity?: number;
  useWorldSpace?: boolean;
};

export function ParticleSystem({
  position = new THREE.Vector3(100, 0, 0),
  particleCount = 500,
  size = 25,
  speed = 0.05,
  maxDistance = 5,
  startColor = 'orange',
  endColor = 'red',
  startOpacity = 1.0,
  endOpacity = 0.0,
  useWorldSpace = false,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const texture = useTexture('/textures/explosion.png');
  const tempVec = new THREE.Vector3();

  // Particle state
  const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
  const lifetimes = useMemo(() => new Float32Array(particleCount), [particleCount]);
  const velocities = useMemo(
    () =>
      new Array(particleCount).fill(0).map(() => {
        const dir = new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
        )
          .normalize()
          .multiplyScalar(speed + Math.random() * speed);
        return dir;
      }),
    [particleCount, speed],
  );

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
          useWorldSpace: { value: useWorldSpace ?? false },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [texture, size, startColor, endColor, startOpacity, endOpacity, useWorldSpace],
  );

  // Animate positions
  useFrame(() => {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const lifeAttr = geometry.getAttribute('aLifetime') as THREE.BufferAttribute;
    for (let i = 0; i < particleCount; i++) {
      let x = positions[i * 3 + 0];
      let y = positions[i * 3 + 1];
      let z = positions[i * 3 + 2];

      x += velocities[i].x;
      y += velocities[i].y;
      z += velocities[i].z;

      // Reset if too far
      const distSq = x * x + y * y + z * z;
      // const maxDistSq = maxDistance * maxDistance;
      const lifetime = Math.sqrt(distSq) / maxDistance;

      if (Math.sqrt(distSq) > maxDistance) {
        x = y = z = 0;
        velocities[i].copy(
          tempVec
            .set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
            .normalize()
            .multiplyScalar(speed + Math.random() * speed),
        );
        lifetimes[i] = 0;
      } else {
        lifetimes[i] = lifetime;
      }

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      posAttr.setXYZ(i, x, y, z);
      lifeAttr.setX(i, lifetimes[i]);
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  });

  return <points position={position} ref={pointsRef} geometry={geometry} material={material} />;
}
