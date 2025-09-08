import * as THREE from "three";

///////////////////////
// TYPES
///////////////////////
export type Vec3Like = THREE.Vector3 | { x: number; y: number; z: number };

function v3(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

function subVec(a: Vec3Like, b: Vec3Like): THREE.Vector3 {
  return v3(a.x - b.x, a.y - b.y, a.z - b.z);
}

///////////////////////
// PRIMITIVE SDFs
///////////////////////

export function sdfPoint(p: Vec3Like, point: Vec3Like): number {
  return subVec(p, point).length();
}

export function sdfSphere(p: Vec3Like, center: Vec3Like, radius: number): number {
  return subVec(p, center).length() - radius;
}

export function sdfBox(
  p: Vec3Like,
  center: Vec3Like,
  dimensions: Vec3Like
): number {
  const halfDim = v3(dimensions.x * 0.5, dimensions.y * 0.5, dimensions.z * 0.5);
  const q = subVec(p, center);
  q.set(Math.abs(q.x), Math.abs(q.y), Math.abs(q.z)).sub(halfDim);
  const maxQ = v3(Math.max(q.x, 0), Math.max(q.y, 0), Math.max(q.z, 0));
  return Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0.0) + maxQ.length();
}

export function sdfCircle(p: Vec3Like, center: Vec3Like, radius: number): number {
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return Math.sqrt(dx * dx + dy * dy) - radius;
}

export function sdfPlane(p: Vec3Like, normal: Vec3Like, h: number): number {
  const n = subVec(normal, v3(0, 0, 0)).normalize();
  return p.x * n.x + p.y * n.y + p.z * n.z + h;
}

export function sdfCapsule(
  p: Vec3Like,
  a: Vec3Like,
  b: Vec3Like,
  r: number
): number {
  const pa = subVec(p, a);
  const ba = subVec(b, a);
  const h = Math.max(0, Math.min(1, pa.dot(ba) / ba.lengthSq()));
  return pa.sub(ba.multiplyScalar(h)).length() - r;
}

export function sdfTorus(
  p: Vec3Like,
  center: Vec3Like,
  t: { major: number; minor: number }
): number {
  const q = subVec(p, center);
  const qXZ = Math.sqrt(q.x * q.x + q.z * q.z) - t.major;
  return Math.sqrt(qXZ * qXZ + q.y * q.y) - t.minor;
}

///////////////////////
// COMBINATION FUNCTIONS
///////////////////////

export function sdfUnion(a: number, b: number) {
  return Math.min(a, b);
}

export function sdfIntersection(a: number, b: number) {
  return Math.max(a, b);
}

export function sdfSubtraction(a: number, b: number) {
  return Math.max(a, -b);
}

export function smoothMax(a: number, b: number, k: number) {
  return Math.log(Math.exp(k * a) + Math.exp(k * b)) / k;
}

export function smoothMin(a: number, b: number, k: number) {
  return -smoothMax(-a, -b, k);
}

export function sdfSmoothUnion(a: number, b: number, k: number) {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return THREE.MathUtils.lerp(b, a, h) - k * h * (1 - h);
}

///////////////////////
// EXAMPLE USAGE
///////////////////////

export function evaluateSDF(p: THREE.Vector3) {
  const sphereDist = sdfSphere(p, v3(0, 0, 0), 1);
  const boxDist = sdfBox(p, v3(1.5, 0, 0), v3(1, 1, 1));

  return {
    union: sdfUnion(sphereDist, boxDist),
    intersection: sdfIntersection(sphereDist, boxDist),
    subtraction: sdfSubtraction(sphereDist, boxDist),
    smooth: smoothMin(sphereDist, boxDist, 5),
  };
}

/**
 * Modifies an existing TubeGeometry to "swell" around specified points.
 * @param tubeGeometry The THREE.TubeGeometry to modify in place.
 * @param curve The curve the tube follows.
 * @param tubeRadius The base radius of the tube.
 * @param swells Array of points along the curve where the tube radius changes.
 */
// Option 1: Named import (works in most setups)
// import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';


export interface SphereSpec {
  t: number;      // Position along curve (0 to 1)
  radius: number; // Radius of the sphere
}

/**
 * Merge tube geometry with spheres placed along a curve.
 * Returns a single merged BufferGeometry.
 */

function sdfTube(p: THREE.Vector3, curvePoint: THREE.Vector3, radius: number): number {
  return p.distanceTo(curvePoint) - radius;
}

/**
 * Deform TubeGeometry by taking min(SDF_tube, SDF_spheres).
 */
export function modifyTubeGeometrySDF(
  tubeGeometry: THREE.TubeGeometry,
  curve: THREE.Curve<THREE.Vector3>,
  spheres: SphereSpec[],
  tubeRadius: number
): THREE.BufferGeometry {
  const posAttr = tubeGeometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    vertex.fromBufferAttribute(posAttr, i);

    // Approximate parameter t for this vertex
    const tAlongCurve = i / posAttr.count;
    const curvePoint = curve.getPointAt(tAlongCurve);

    // Start with tube SDF
    let sdf = sdfTube(vertex, curvePoint, tubeRadius);

    // Compare with each sphere
    for (const { t, radius } of spheres) {
      const sphereCenter = curve.getPointAt(t);
      const sphereSDF = sdfSphere(vertex, sphereCenter, radius);
      sdf = Math.min(sphereSDF, sdf); // Hard union: take the min
    }

    // Get direction from curve center to vertex (normal-ish)
    const dir = vertex.clone().sub(curvePoint).normalize();

    // Place vertex on the surface (sdf = 0)
    vertex.copy(curvePoint).addScaledVector(dir, tubeRadius - sdf);

    posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  posAttr.needsUpdate = true;
  tubeGeometry.computeVertexNormals();

  return tubeGeometry;
}

