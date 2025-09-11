import * as THREE from 'three';
import { sdfSphere } from './SDF'; // using your SDF library

interface DeformationSphere {
  t: number; // parameter along curve (0-1)
  radius: number; // sphere radius
}

/**
 * Deform a geometry by combining it with SDF spheres (hard union).
 * Sphere centers are computed from a single curve.
 */
export function deformGeometryWithSpheres(
  geometry: THREE.BufferGeometry,
  curve: THREE.Curve<THREE.Vector3>,
  deformationSpheres: DeformationSphere[],
) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    let minDist = Infinity;
    let closestSphere: { center: THREE.Vector3; radius: number } | null = null;

    for (const sphere of deformationSpheres) {
      const center = curve.getPoint(sphere.t);
      const dist = sdfSphere(vertex, center, sphere.radius);

      if (dist < minDist) {
        minDist = dist;
        closestSphere = { center, radius: sphere.radius };
      }
    }

    if (closestSphere && minDist < 0) {
      const dir = vertex.clone().sub(closestSphere.center).normalize();
      const targetPos = closestSphere.center.clone().add(dir.multiplyScalar(closestSphere.radius));
      vertex.copy(targetPos);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

import { BufferGeometry, BufferAttribute, Vector3 } from 'three';

// Utility: push vertices out to a proper cube-sphere
export function spherifyGeometry(geometry: BufferGeometry, radius: number) {
  const pos = geometry.attributes.position as BufferAttribute;
  const v = new Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Step 1: normalize to cube space (-1..1)
    // If your geometry is already in [-1,1] range (like your CubeTree quads),
    // you can skip dividing by len. But it's safer to rescale:
    const len = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    const cube = v.clone().divideScalar(len);

    // Step 2: map cube -> sphere
    const s = cubeToSphere(cube);

    // Step 3: scale to radius
    pos.setXYZ(i, s.x * radius, s.y * radius, s.z * radius);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function cubeToSphere(v: Vector3): Vector3 {
  const x = v.x;
  const y = v.y;
  const z = v.z;

  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;

  const sx = x * Math.sqrt(1 - y2 / 2 - z2 / 2 + (y2 * z2) / 3);
  const sy = y * Math.sqrt(1 - z2 / 2 - x2 / 2 + (z2 * x2) / 3);
  const sz = z * Math.sqrt(1 - x2 / 2 - y2 / 2 + (x2 * y2) / 3);

  return new Vector3(sx, sy, sz);
}

/**
 * Creates a THREE.BufferGeometry from SharedArrayBuffers returned by your workers.
 *
 * @param position - Float32Array containing vertex positions [x, y, z].
 * @param normal - Float32Array containing vertex normals [x, y, z].
 * @param index - Uint32Array containing triangle indices.
 * @returns A THREE.BufferGeometry ready to render.
 */
export function createGeometryFromSharedBuffers(
  position: Float32Array,
  normal: Float32Array,
  index: Uint32Array,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Attach attributes directly
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));

  // Optional: Compute bounding info
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export function buildGeometryFromSAB(
  position: SharedArrayBuffer,
  normal: SharedArrayBuffer,
  index: SharedArrayBuffer,
  // vertexCount: number,
  // indexCount: number
) {
  const posArr = new Float32Array(position);
  const normArr = new Float32Array(normal);
  const idxArr = new Uint32Array(index);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  geometry.setIndex(new THREE.BufferAttribute(idxArr, 1));

  return geometry;
}

// types/terrain.ts
export interface TerrainBuildTask {
  width: number;
  height: number;
  planetSize: number;
  uniforms: {
    uMaxHeight: number;
    uFrequency: number;
    uAmplitude: number;
    uOctaves: number;
    uLacunarity: number;
    uPersistence: number;
    uExponentiation: number;
  };
  transform: {
    quaternion: [number, number, number, number];
    translation: [number, number, number];
  };
}
