import * as THREE from 'three';

///////////////////////
// PRIMITIVE SDFs
///////////////////////

function vectorAbs(v: THREE.Vector3) {
  return new THREE.Vector3(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
}

function vectorMax(v: THREE.Vector3, min: THREE.Vector3) {
  return new THREE.Vector3(Math.max(v.x, min.x), Math.max(v.y, min.y), Math.max(v.z, min.z));
}

export function sdfSphere(p: THREE.Vector3, center: THREE.Vector3, radius: number) {
  return p.clone().sub(center).length() - radius;
}

export function sdfBox(p: THREE.Vector3, center: THREE.Vector3, dimensions: THREE.Vector3) {
  const halfDim = dimensions.clone().multiplyScalar(0.5);
  const q = vectorAbs(p.clone().sub(center)).sub(halfDim);
  const maxQ = vectorMax(q, new THREE.Vector3(0, 0, 0));
  return Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0.0) + maxQ.length();
}

export function sdfCircle(p: THREE.Vector3, center: THREE.Vector3, radius: number) {
  // 2D circle in XY plane
  const d = new THREE.Vector2(p.x - center.x, p.y - center.y);
  return d.length() - radius;
}

export function sdfPoint(p: THREE.Vector3, point: THREE.Vector3) {
  return p.clone().sub(point).length();
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

///////////////////////
// EXAMPLE USAGE
///////////////////////

// Evaluate distance to combined geometry
export function evaluateSDF(p: THREE.Vector3) {
  const sphereDist = sdfSphere(p, new THREE.Vector3(0, 0, 0), 1);
  const boxDist = sdfBox(p, new THREE.Vector3(1.5, 0, 0), new THREE.Vector3(1, 1, 1));

  // Union
  const combinedUnion = sdfUnion(sphereDist, boxDist);

  // Intersection
  const combinedIntersection = sdfIntersection(sphereDist, boxDist);

  // Subtraction (sphere - box)
  const combinedSubtraction = sdfSubtraction(sphereDist, boxDist);

  // Smooth union with k = 5
  const combinedSmooth = smoothMin(sphereDist, boxDist, 5);

  return { combinedUnion, combinedIntersection, combinedSubtraction, combinedSmooth };
}
