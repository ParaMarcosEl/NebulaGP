// ParticleSystem.tsx
import * as THREE from "three";
import { useRef, useEffect, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  startSize: number;
  endSize: number;
  color: THREE.Color;
  startColor: THREE.Color;
  endColor?: THREE.Color | null;
  alpha: number;
  rotation: number;
  lifetime: number;
  age: number;
};

const vertexShader = `
  attribute float size;
  attribute vec3 color;
  attribute float alpha;
  attribute float rotation;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vCos;
  varying float vSin;

  void main() {
    vColor = color;
    vAlpha = alpha;
    vCos = cos(rotation);
    vSin = sin(rotation);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 🔹 bigger and more consistent point size
//     float depth = max(-mvPosition.z, 1.0);   // avoid negatives / near zero
// gl_PointSize = clamp(size * (50.0 / depth), 1.0, 100.0);
// gl_PointSize = size * (50.0 / -mvPosition.z);

    // Make points perspective-size aware
    gl_PointSize = size * (50.0 / -mvPosition.z); // tweak 300 for scaling

  }
`;

const fragmentShader = `
  uniform sampler2D diffuseTexture;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vCos;
  varying float vSin;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    vec2 rotated;
    rotated.x = centered.x * vCos - centered.y * vSin;
    rotated.y = centered.x * vSin + centered.y * vCos;
    rotated += 0.5;

    vec4 tex = texture2D(diffuseTexture, rotated);
    gl_FragColor = vec4(vColor, vAlpha) * tex;
  }
`;

type ParticleSystemProps = {
  speed?: number;
  target?: React.RefObject<THREE.Object3D>;
  maxDistance?: number;
  position?: THREE.Vector3;
  lifetime?: number;
  offset?: THREE.Vector3;
  maxParticles?: number;
  startSize?: number;
  endSize?: number;
  startColor?: THREE.Color;
  endColor?: THREE.Color;
  startAlpha?: number;
  startRotation?: number;
  texturePath?: string;
  emissionRate?: number;
};

export default function ParticleSystem({
  target,
  maxDistance = 1000,
  speed = 1,
  texturePath,
  // offset = new THREE.Vector3(),
  position = new THREE.Vector3(),
  lifetime = 0,
  startSize = 30, // 🔹 bigger for visibility
  endSize,
  maxParticles = 200,
  startColor = new THREE.Color(1, 1, 0),
  endColor = new THREE.Color(1, 0, 0),
  startAlpha = 1,
  startRotation = Math.random() * Math.PI * 2,
  emissionRate = 30, // particles per second
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useRef<Particle[]>([]);
  const groupRef = useRef<THREE.Object3D>(null);

    // This is the correct way to set up the geometry for a point-based particle system
    const { geometry, positions, sizes, colors, alphas, rotations } = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(maxParticles * 3);
        const sizes = new Float32Array(maxParticles);
        const colors = new Float32Array(maxParticles * 3);
        const alphas = new Float32Array(maxParticles);
        const rotations = new Float32Array(maxParticles);

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geo.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
        geo.setAttribute("rotation", new THREE.BufferAttribute(rotations, 1));

        return { geometry: geo, positions, sizes, colors, alphas, rotations };
    }, [maxParticles]);
  const emissionAccumulator = useRef(0);

  useEffect(() => {
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute("rotation", new THREE.BufferAttribute(rotations, 1));
  }, [geometry, positions, sizes, colors, alphas, rotations]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          diffuseTexture: {
            value: new THREE.TextureLoader().load(
              texturePath ||
                // 🔹 tiny white dot fallback
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAKUlEQVQoU2NkYGBg+M8ABRgYGBiAhoDAwMDAgKExgAxUCUjAwGBgAABXWgQQbaxO6AAAAAElFTkSuQmCC"
            ),
          },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      }),
    [texturePath]
  );

  const updateGeometry = useCallback(() => {

    particles.current.forEach((p, i) => {
      positions[i * 3 + 0] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      sizes[i] = p.size;
      colors[i * 3 + 0] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      alphas[i] = p.alpha;
      rotations[i] = p.rotation;
    });

    // Reset unused attributes for a clean slate
    for (let i = particles.current.length; i < maxParticles; i++) {
        positions[i * 3 + 0] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        sizes[i] = 0;
        colors[i * 3 + 0] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
        alphas[i] = 0;
        rotations[i] = 0;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.rotation.needsUpdate = true;

    // Set draw range to render only active particles
    geometry.setDrawRange(0, particles.current.length);
    // 🔹 Add this line to update the bounding sphere for frustum culling
    if (geometry.attributes.position.count > 0) {
      geometry.computeBoundingSphere();
    }
  }, [geometry, positions, sizes, colors, alphas, rotations, maxParticles]);

  const spawnParticle = useCallback(() => {
    if (!target?.current || particles.current.length >= maxParticles) return;

    const shipPos = target.current.position.clone();
    const shipQuat = target.current.quaternion.clone();

    const backwardDir = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(shipQuat)
      .normalize();

    const vel = backwardDir
      .clone()
      .multiplyScalar(speed)
      .add(
        new THREE.Vector3(
          (Math.random() * 2 - 1) * 0.01,
          (Math.random() * 2 - 1) * 0.01,
          (Math.random() * 2 - 1) * 0.01
        )
      );

      const radius = 0.1; // tweak this for spread
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius; // sqrt for uniform distribution

      // local offset in XY plane
      const localOffset = new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle) * r + .3,
        1.5
      );

      localOffset.applyQuaternion(shipQuat);

    const pos = shipPos.clone().add(localOffset);

    particles.current.push({
      position: pos,
      velocity: vel,
      size: startSize,
      startSize,
      endSize: endSize || startSize,
      color: startColor.clone(),
      startColor: startColor.clone(),
      endColor: endColor?.clone(),
      alpha: startAlpha,
      rotation: startRotation,
      lifetime,
      age: 0,
    });
  }, [target, speed, startSize, endSize, startColor, endColor, startAlpha, startRotation, lifetime, maxParticles]);
  
  // 🔹 New function to cull particles based on distance
  const cullParticlesbyDistance = useCallback(() => {
    if (!target?.current) return;
    const targetPos = target.current.position;

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      if (p.position.distanceTo(targetPos) > maxDistance) {
        particles.current.splice(i, 1);
      }
    }
  }, [target, maxDistance]);  
  // 🔹 New function to cull particles based on distance
  const cullParticlesbyLifetime = useCallback((p: Particle, i: number) => {
      if (p.age > p.lifetime) {
        particles.current.splice(i, 1);
        return true;
      }
      return false;
}, []);

const lastSpawnPos = useRef<THREE.Vector3>(new THREE.Vector3());

useFrame((_, delta) => {
  if (!target?.current) return;
  const shipPos = target.current.position;

  // --- 🔹 TIME-BASED EMISSION (baseline steady exhaust)
  emissionAccumulator.current += delta;
  const interval = 1 / emissionRate;
  while (emissionAccumulator.current > interval) {
    spawnParticle();
    emissionAccumulator.current -= interval;
  }

  // --- 🔹 DISTANCE-BASED EMISSION (extra particles at high speed)
  const dist = shipPos.distanceTo(lastSpawnPos.current);
  const spawnSpacing = 0.15; // adjust for density (smaller = denser trail)
  if (dist > spawnSpacing) {
    spawnParticle();
    lastSpawnPos.current.copy(shipPos);
  }

  // --- 🔹 UPDATE PARTICLES
  for (let i = particles.current.length - 1; i >= 0; i--) {
    const p = particles.current[i];
    p.age += delta;

    if (lifetime && cullParticlesbyLifetime(p, i)) continue;

    const damping = 0.98;
    p.velocity.multiplyScalar(damping);
    p.position.addScaledVector(p.velocity, delta);

    const t = p.age / p.lifetime;
    const distanceTraveled = p.position.distanceTo(shipPos);
    const d = Math.min(distanceTraveled / maxDistance, 1);

    p.size = THREE.MathUtils.lerp(p.startSize, p.endSize, t);
    p.alpha = startAlpha * (1 - t);

    if (p.endColor) {
      p.color.lerpColors(p.startColor, p.endColor, d * 1.4);
    }
  }

  // Cull and update GPU buffers
  cullParticlesbyDistance();
  updateGeometry();
});


  return (
    <group ref={groupRef} position={position.clone()}>
      <points ref={pointsRef} args={[geometry, material]} />
    </group>
  );
}