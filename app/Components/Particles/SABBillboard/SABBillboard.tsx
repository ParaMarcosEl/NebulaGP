// ================================
// File: SABBillboardParticles.tsx
// ================================
import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * SharedArrayBuffer + Worker driven particle system using instanced camera-facing quads.
 * - Worker writes particle state directly into SAB views (pos/size/color/rot)
 * - Render thread reads SAB-backed Float32Array views as InstancedBufferAttributes
 * - Vertex shader expands each instance into a billboard quad (no geometry shader)
 */

// ---- Config ----
// const FLOATS_PER_PARTICLE = 8; // [x,y,z, size, r,g,b, rot]

// ---- Shaders ----
const vert = /* glsl */`
  uniform vec3 cameraRight;
  uniform vec3 cameraUp;

  attribute vec2 corner;      // per-vertex: (-0.5..0.5)
  attribute vec3 iPos;       // per-instance
  attribute float iSize;     // per-instance
  attribute vec3 iColor;     // per-instance
  attribute float iRot;      // per-instance (radians)

  varying vec3 vColor;

  void main() {
    vColor = iColor;

    // rotate the local quad corner in 2D by iRot
    float c = cos(iRot);
    float s = sin(iRot);
    vec2 rc;
    rc.x = corner.x * c - corner.y * s;
    rc.y = corner.x * s + corner.y * c;

    // expand into world space using camera basis
    vec3 worldPos = iPos + (cameraRight * rc.x + cameraUp * rc.y) * iSize;

    // gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);

    // This should draw all particles at the origin
    gl_Position = projectionMatrix * viewMatrix * vec4(iPos, 1.0);
  }
`;

const frag = /* glsl */`
  precision mediump float;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, 1.0); // solid color for now (white if set)
  }
`;

// ---- Worker Helper ----
function useParticleWorker(numParticles: number) {
  const sabRef = useRef<SharedArrayBuffer | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // SAB views (split for clean attributes)
  const posViewRef = useRef<Float32Array | null>(null);   // length = N * 3
  const sizeViewRef = useRef<Float32Array | null>(null);  // length = N
  const colorViewRef = useRef<Float32Array | null>(null); // length = N * 3
  const rotViewRef = useRef<Float32Array | null>(null);   // length = N

  useEffect(() => {
  // Total SAB size in bytes
  const sabSize =
    numParticles * 3 * Float32Array.BYTES_PER_ELEMENT + // positions
    numParticles * Float32Array.BYTES_PER_ELEMENT +     // sizes
    numParticles * 3 * Float32Array.BYTES_PER_ELEMENT + // colors
    numParticles * Float32Array.BYTES_PER_ELEMENT;      // rotations

  const sab = new SharedArrayBuffer(sabSize);

  let offset = 0;
  const posView = new Float32Array(sab, offset, numParticles * 3);
  offset += numParticles * 3 * Float32Array.BYTES_PER_ELEMENT;

  const sizeView = new Float32Array(sab, offset, numParticles);
  offset += numParticles * Float32Array.BYTES_PER_ELEMENT;

  const colorView = new Float32Array(sab, offset, numParticles * 3);
  offset += numParticles * 3 * Float32Array.BYTES_PER_ELEMENT;

  const rotView = new Float32Array(sab, offset, numParticles);
  // offset += numParticles * Float32Array.BYTES_PER_ELEMENT; // optional

  // Store references
  sabRef.current = sab;
  posViewRef.current = posView;
  sizeViewRef.current = sizeView;
  colorViewRef.current = colorView;
  rotViewRef.current = rotView;

  // Spawn worker
  const worker = new Worker(new URL("./particle.worker.ts", import.meta.url), { type: "module" });
  workerRef.current = worker;
  worker.postMessage({ sab, numParticles });

  // Cleanup on unmount
  return () => {
    worker.terminate();
    workerRef.current = null;
    sabRef.current = null;
  };
}, [numParticles]);

  return {
    sabRef,
    posViewRef,
    sizeViewRef,
    colorViewRef,
    rotViewRef,
    workerRef,
  } as const;
}

// ---- Instanced geometry component ----
function SABBillboards({ 
    count = 10000, 
    position = new THREE.Vector3(),
}: { 
    count?: number;
    position?: THREE.Vector3;
}) {
  const { camera } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);

  // Shared buffers updated by worker
  const { posViewRef, sizeViewRef, colorViewRef, rotViewRef } = useParticleWorker(count);

  const baseGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // 4 corners (-0.5..0.5 range)
    const corners = new Float32Array([
      -0.5, -0.5,
      0.5, -0.5,
      0.5, 0.5,
      -0.5, 0.5,
    ]);
    geo.setAttribute("corner", new THREE.BufferAttribute(corners, 2));

    // Two triangles
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    return geo;
  }, []);

  // Instanced geometry wrapping the base quad
  const instancedGeo = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    g.index = baseGeo.index;
    g.setAttribute("corner", baseGeo.getAttribute("corner"));

    // Allocate placeholder attributes; actual arrays come from SAB views when available
    g.instanceCount = count;
    g.setAttribute("iPos", new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("iSize", new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
    g.setAttribute("iColor", new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("iRot", new THREE.InstancedBufferAttribute(new Float32Array(count), 1));

    return g;
  }, [baseGeo, count]);


  // Swap the attribute arrays to SAB views once the worker has created them
  useEffect(() => {
    if (posViewRef.current) {
      (instancedGeo.getAttribute("iPos") as THREE.InstancedBufferAttribute).array = posViewRef.current;
    }
    if (sizeViewRef.current) {
      (instancedGeo.getAttribute("iSize") as THREE.InstancedBufferAttribute).array = sizeViewRef.current;
    }
    if (colorViewRef.current) {
      (instancedGeo.getAttribute("iColor") as THREE.InstancedBufferAttribute).array = colorViewRef.current;
    }
    if (rotViewRef.current) {
      (instancedGeo.getAttribute("iRot") as THREE.InstancedBufferAttribute).array = rotViewRef.current;
    }

    // Mark once after binding; per-frame we only toggle needsUpdate flags
    instancedGeo.attributes.iPos.needsUpdate = true;
    instancedGeo.attributes.iSize.needsUpdate = true;
    instancedGeo.attributes.iColor.needsUpdate = true;
    instancedGeo.attributes.iRot.needsUpdate = true;
  }, [instancedGeo, posViewRef, sizeViewRef, colorViewRef, rotViewRef]);

  // Update camera basis and mark attributes dirty so three uploads the SAB region
  useFrame(() => {
    if (!matRef.current) return;

    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, fwd);

    matRef.current.uniforms.cameraRight.value.copy(right.normalize());
    matRef.current.uniforms.cameraUp.value.copy(up.normalize());

    // Flag attributes for GPU upload (data already written by worker)
    if (instancedGeo) {
      instancedGeo.attributes.iPos.needsUpdate = true;
      instancedGeo.attributes.iSize.needsUpdate = true;
      instancedGeo.attributes.iColor.needsUpdate = true;
      instancedGeo.attributes.iRot.needsUpdate = true;

      // Optional: disable frustum culling if effects are around camera
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (meshRef.current as any).frustumCulled = false;
    }
  });

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      cameraRight: { value: new THREE.Vector3(1, 0, 0) },
      cameraUp: { value: new THREE.Vector3(0, 1, 0) },
    },
  }), []);

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={instancedGeo} material={material} />
    </group>
  );
}

export default SABBillboards;