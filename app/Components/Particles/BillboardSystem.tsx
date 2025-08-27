import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';

/**
 * NOTE: WebGL in browsers (via three.js/R3F) does not support geometry shaders.
 * This example mimics a geometry stage by expanding a single particle position
 * into a camera-facing quad entirely in the vertex shader using the camera's
 * Right/Up vectors passed as uniforms.
 *
 * The fragment shader outputs solid white for now.
 */

const vert = /* glsl */ `
uniform vec3 cameraRight;
uniform vec3 cameraUp;
uniform vec3 particlePos;  // world-space center of the particle
uniform float size;

attribute vec2 corner;     // -0.5..0.5 per-vertex

void main() {
  // Scale corners by size, align with camera, and offset to particlePos
  vec3 worldPos = particlePos 
                + (cameraRight * corner.x * size)
                + (cameraUp    * corner.y * size);

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
`;

const frag = /* glsl */ `
precision mediump float;
void main() {
  gl_FragColor = vec4(1.0); // solid white for now
}
`;

export function BillboardParticleSystem({
  position = new THREE.Vector3(0, 0, 0),
  size = 1,
}: {
  position?: THREE.Vector3;
  size?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const { camera } = useThree();

  // Build a unit quad with a custom `corner` attribute so the vertex shader can expand it
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const corners = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    geo.setAttribute('corner', new THREE.BufferAttribute(corners, 2));
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, []);

  // Update camera basis vectors and uniforms every frame
  useFrame(() => {
    if (!matRef.current) return;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, forward);

    matRef.current.uniforms.cameraRight.value.copy(right.normalize());
    matRef.current.uniforms.cameraUp.value.copy(up.normalize());
    matRef.current.uniforms.particlePos.value.copy(position);
    matRef.current.uniforms.size.value = size;
  });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        depthTest: true,
        depthWrite: true,
        transparent: false,
        uniforms: {
          cameraRight: { value: new THREE.Vector3(1, 0, 0) },
          cameraUp: { value: new THREE.Vector3(0, 1, 0) },
          particlePos: { value: new THREE.Vector3() },
          size: { value: 1 },
        },
      }),
    [],
  );

  return (
    <mesh geometry={geometry} material={material}>
      <shaderMaterial ref={matRef as React.RefObject<THREE.ShaderMaterial>} args={[material]} />
    </mesh>
  );
}
