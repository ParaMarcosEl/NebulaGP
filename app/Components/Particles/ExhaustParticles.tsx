// ExhaustParticles.tsx
import * as THREE from 'three';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

type MaybeRef<T> = T | React.RefObject<T>;

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  age: number;
  lifetime: number;
  rotation: number;
  alive: boolean;
};

type Props = {
  target?: MaybeRef<THREE.Object3D>;
  maxParticles?: number;
  emissionRate?: number; // particles per second
  speed?: number;
  startSize?: number;
  lifetime?: number;
  noise?: number;
  maxDistance?: number;
};

const vertexShader = `
  precision mediump float;

  attribute float size;
  attribute vec3 color;
  attribute float alpha;
  attribute float rotation;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vRotation;

  void main() {
    vColor = color;
    vAlpha = alpha;
    vRotation = rotation;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // protect against z==0
    float z = -mvPosition.z + 1e-6;
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  precision mediump float;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vRotation;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float c = cos(vRotation);
    float s = sin(vRotation);
    vec2 r = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

    float dist = length(r);
    if (dist > 0.5) discard;

    float fall = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(vColor, vAlpha * fall);
  }
`;

export default function TrailParticles({
  target,
  maxParticles = 2000,
  emissionRate = 200,
  speed = 5,
  startSize = 5,
  lifetime = 0.2,
  noise = 0.01,
  maxDistance = 500,
}: Props) {
  // helper: accept either object or ref
  const getTargetObject = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (target && 'current' in (target as any)
      ? (target as React.RefObject<THREE.Object3D>).current
      : (target as THREE.Object3D)) || null;

  // Preallocated particle pool
  const particles = useMemo(() => {
    const arr: Particle[] = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i++) {
      arr[i] = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(1, 1, 1),
        size: 0,
        alpha: 0,
        age: 0,
        lifetime: 0,
        rotation: 0,
        alive: false,
      };
    }
    return arr;
  }, [maxParticles]);

  // Flat GPU buffers (preallocated)
  const positions = useMemo(() => new Float32Array(maxParticles * 3), [maxParticles]);
  const colors = useMemo(() => new Float32Array(maxParticles * 3), [maxParticles]);
  const sizes = useMemo(() => new Float32Array(maxParticles), [maxParticles]);
  const alphas = useMemo(() => new Float32Array(maxParticles), [maxParticles]);
  const rotations = useMemo(() => new Float32Array(maxParticles), [maxParticles]);

  // BufferGeometry (created once)
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));

    // large fixed bounding sphere to avoid per-frame recompute
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxDistance);
    geo.setDrawRange(0, 0);
    return geo;
  }, [positions, colors, sizes, alphas, rotations, maxDistance]);

  // Shader material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // attributes are read directly; no need for lights or vertexColors flag
      }),
    [],
  );

  // freelist (stack of indices)
  const freeList = useRef<number[]>([]);
  useEffect(() => {
    const list: number[] = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i++) list[i] = maxParticles - 1 - i; // fill reversed (LIFO)
    freeList.current = list;

    // initialize buffers to invisible
    for (let i = 0; i < maxParticles; i++) {
      sizes[i] = 0;
      alphas[i] = 0;
      colors[i * 3 + 0] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      rotations[i] = 0;
    }
  }, [maxParticles, sizes, alphas, colors, positions, rotations]);

  // Preallocated temps to avoid allocations
  const tmpLocalVel = useRef(new THREE.Vector3());
  const tmpLocalOffset = useRef(new THREE.Vector3());
  const tmpQuat = useRef(new THREE.Quaternion());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tmpWorldPos = useRef(new THREE.Vector3());
  const spawnAcc = useRef(0);

  // spawn: compute local-space velocity + noise, transform to world ONCE (so per-frame is cheap)
  const spawnParticle = () => {
    const fl = freeList.current;
    if (fl.length === 0) return;

    const i = fl.pop()!;
    const p = particles[i];

    const t = getTargetObject();
    if (!t) {
      // no attached target: still create in world origin
      tmpLocalVel.current.set(0, 0, 1).multiplyScalar(speed);
      tmpLocalVel.current.x += (Math.random() * 2 - 1) * noise;
      tmpLocalVel.current.y += (Math.random() * 2 - 1) * noise;
      tmpLocalVel.current.z += (Math.random() * 2 - 1) * noise;

      // position in world-space at origin
      p.position.set(0, 0, 0);

      p.velocity.copy(tmpLocalVel.current); // world since target missing
    } else {
      // build local-space velocity (no allocations)
      tmpLocalVel.current.set(0, 0, 1).multiplyScalar(speed);
      tmpLocalVel.current.x += (Math.random() * 2 - 1) * noise;
      tmpLocalVel.current.y += (Math.random() * 2 - 1) * noise;
      tmpLocalVel.current.z += (Math.random() * 2 - 1) * noise;

      // rotate local velocity into world using target quaternion (fast)
      tmpQuat.current.copy(t.quaternion);
      tmpLocalVel.current.applyQuaternion(tmpQuat.current);
      p.velocity.copy(tmpLocalVel.current);

      // choose a small local offset around exhaust and convert to world pos (single transform)
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.1;
      tmpLocalOffset.current.set(Math.cos(angle) * r, Math.sin(angle) * r + 0.3, 1.5);
      t.localToWorld(tmpLocalOffset.current);
      p.position.copy(tmpLocalOffset.current);
    }

    p.age = 0;
    p.lifetime = lifetime * (0.9 + Math.random() * 0.2); // slight variance
    p.size = startSize * (0.8 + Math.random() * 0.6);
    p.alpha = 1;
    p.rotation = Math.random() * Math.PI * 2;
    p.color.setHSL(0.12 + Math.random() * 0.04, 1, 0.5);
    p.alive = true;

    // write initial GPU slot directly
    positions[i * 3 + 0] = p.position.x;
    positions[i * 3 + 1] = p.position.y;
    positions[i * 3 + 2] = p.position.z;
    sizes[i] = p.size;
    colors[i * 3 + 0] = p.color.r;
    colors[i * 3 + 1] = p.color.g;
    colors[i * 3 + 2] = p.color.b;
    alphas[i] = p.alpha;
    rotations[i] = p.rotation;

    // ensure draw range covers this index (cheap)
    const prevCount = geometry.drawRange.count || 0;
    if (i + 1 > prevCount) geometry.setDrawRange(0, i + 1);
  };

  // main update loop
  useFrame((_, delta) => {
    const t = getTargetObject();
    if (!t && freeList.current.length === maxParticles) {
      // nothing to do if no target and no alive particles
      return;
    }

    // spawn according to emissionRate
    spawnAcc.current += emissionRate * delta;
    while (spawnAcc.current >= 1.0) {
      spawnParticle();
      spawnAcc.current -= 1.0;
    }

    // damping factor (frame-rate stable approx)
    const damping = Math.pow(0.98, delta * 60);

    let highestAlive = -1;
    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      if (!p.alive) continue;

      p.age += delta;
      if (p.lifetime > 0 && p.age >= p.lifetime) {
        p.alive = false;
        freeList.current.push(i);
        sizes[i] = 0;
        alphas[i] = 0;
        continue;
      }

      // integrate (p.velocity is in world space)
      p.velocity.multiplyScalar(damping);
      p.position.addScaledVector(p.velocity, delta);

      // write to GPU buffers
      positions[i * 3 + 0] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      sizes[i] = p.size;
      colors[i * 3 + 0] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      alphas[i] = Math.max(0, 1 - p.age / (p.lifetime + 1e-6));
      rotations[i] = p.rotation;

      highestAlive = i;
    }

    // tighten draw range if needed
    if (highestAlive >= 0) geometry.setDrawRange(0, highestAlive + 1);
    else geometry.setDrawRange(0, 0);

    // mark attributes once per frame
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.rotation as THREE.BufferAttribute).needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={true} />;
}
