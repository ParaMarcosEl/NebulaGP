// utils/getStartPoseFromCurve.ts
import * as THREE from 'three';
import { SvgMapOptions } from '@/Constants';

export function getStartPoseFromCurve(
  curve: THREE.Curve<THREE.Vector3>,
  distance = 0, // Distance along the curve to spawn from
) {
  const t = distance; // value between 0 and 1
  const position = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();

  //   const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1), // default forward
    tangent,
  );

  return {
    position: position.toArray() as [number, number, number],
    quaternion,
  };
}

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10); // 2-digit milliseconds

  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');

  return `${pad(minutes)}:${pad(seconds)}:${pad(milliseconds)}`;
}

export function randomNumber(length: number = 10, charset: string = '0123456789'): number {
  let result = '';
  const charactersLength = charset.length;
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charactersLength));
  }
  return Number(result);
}

/**
 * Returns the normalized progress `t` (0 to 1) of a point along a curve.
 * @param curve - The THREE.Curve representing the track.
 * @param point - The world position to check.
 * @param segments - The resolution of the curve (more segments = better accuracy).
 */
export function getProgressAlongCurve(
  curve: THREE.Curve<THREE.Vector3>,
  position: THREE.Vector3,
): number {
  const divisions = 1000;
  const points = curve.getPoints(divisions);
  let closestIndex = 0;
  let minDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dist = position.distanceToSquared(points[i]);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }

  return closestIndex / divisions;
}

/**
 * @typedef {object} SvgMapOptions
 * @property {number} [svgWidth=500] - The desired width of the output SVG.
 * @property {number} [svgHeight=500] - The desired height of the output SVG.
 * @property {number} [padding=20] - Padding around the curve within the SVG, in pixels.
 * @property {number} [numSegments=100] - The number of points to sample from the 3D curve. More segments mean a smoother curve.
 * @property {string} [strokeColor='blue'] - The color of the curve line in SVG.
 * @property {number} [strokeWidth=2] - The width of the curve line in SVG.
 * @property {string} [backgroundColor='transparent'] - The background color of the SVG.
 */

/**
 * Generates an SVG string representing a 2D bird's-eye view (X-Z plane) of a THREE.Curve<THREE.Vector3>.
 * The curve is scaled and centered within the specified SVG dimensions with padding.
 *
 * @param {THREE.Curve<THREE.Vector3>} curve - The 3D curve object from Three.js.
 * @param {SvgMapOptions} [options] - Optional configuration for the SVG map.
 * @returns {string} The complete SVG string.
 */

export function generateCurveSvgMap(
  curve: THREE.Curve<THREE.Vector3>,
  options?: SvgMapOptions,
): string {
  const {
    svgWidth = 500,
    svgHeight = 500,
    padding = 20,
    numSegments = 100,
    strokeColor = 'blue',
    strokeWidth = 2,
    backgroundColor = 'transparent',
  } = options || {};

  const points = curve.getPoints(numSegments);
  if (points.length === 0) {
    return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="background-color:${backgroundColor}"></svg>`;
  }

  // --- Isometric projection bounds ---
  const angle = Math.PI / 4; // 45°
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  const projectedPoints = points.map((point) => {
    const isoX = (point.x - point.z) * Math.cos(angle);
    const isoY = (point.x + point.z) * Math.sin(angle) - point.y;

    minX = Math.min(minX, isoX);
    maxX = Math.max(maxX, isoX);
    minY = Math.min(minY, isoY);
    maxY = Math.max(maxY, isoY);

    return { x: isoX, y: isoY };
  });

  const curveWorldWidth = maxX - minX;
  const curveWorldHeight = maxY - minY;

  const availableWidth = svgWidth - padding * 2;
  const availableHeight = svgHeight - padding * 2;

  const scaleX = curveWorldWidth > 0 ? availableWidth / curveWorldWidth : 1;
  const scaleY = curveWorldHeight > 0 ? availableHeight / curveWorldHeight : 1;
  const scale = Math.min(scaleX, scaleY);

  const actualScaledWidth = curveWorldWidth * scale;
  const actualScaledHeight = curveWorldHeight * scale;

  const translateX = padding + (availableWidth - actualScaledWidth) / 2 - minX * scale;
  const translateY = padding + (availableHeight - actualScaledHeight) / 2 - minY * scale;

  // --- Build SVG path ---
  let pathD = '';
  for (let i = 0; i < projectedPoints.length; i++) {
    const { x, y } = projectedPoints[i];
    const sx = x * scale + translateX;
    const sy = y * scale + translateY;

    pathD += i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`;
  }

  const svgString = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="background-color:${backgroundColor}">
      <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  return svgString;
}

export function createProjectionHelper(curve: THREE.Curve<THREE.Vector3>, options?: SvgMapOptions) {
  const { svgWidth = 500, svgHeight = 500, padding = 20, numSegments = 100 } = options || {};

  const points = curve.getPoints(numSegments);

  // Get min/max for projection
  let minX = Infinity,
    maxX = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  const curveWorldWidth = maxX - minX;
  const curveWorldHeight = maxZ - minZ;

  const availableWidth = svgWidth - padding * 2;
  const availableHeight = svgHeight - padding * 2;

  const scaleX = curveWorldWidth > 0 ? availableWidth / curveWorldWidth : 1;
  const scaleY = curveWorldHeight > 0 ? availableHeight / curveWorldHeight : 1;
  const scale = Math.min(scaleX, scaleY);

  const translateX = padding + (availableWidth - curveWorldWidth * scale) / 2 - minX * scale;
  const translateY = padding + (availableHeight - curveWorldHeight * scale) / 2 - minZ * scale;

  // Return a projection function
  const project = (point: THREE.Vector3) => {
    const x2D = (point.x + point.z) * 0.5; // 45° projection
    const y2D = point.y;
    return {
      x: x2D * scale + translateX,
      y: y2D * scale + translateY,
    };
  };

  return { project, svgWidth, svgHeight };
}

export function generateSvgPathProjected(
  curve: THREE.Curve<THREE.Vector3>,
  numSegments = 100,
): string {
  const points = curve.getPoints(numSegments);

  if (points.length === 0) return '';

  // Use a 45° projection matrix (like isometric X/Z view)
  // x' = (x + z) * 0.5
  // y' = (z - x) * 0.5
  const projectedPoints = points.map((p) => {
    const x = (p.x + p.z) * 0.5;
    const y = (p.z - p.x) * 0.5;
    return { x, y };
  });

  // Normalize points to SVG coordinate space (0–100)
  const minX = Math.min(...projectedPoints.map((p) => p.x));
  const maxX = Math.max(...projectedPoints.map((p) => p.x));
  const minY = Math.min(...projectedPoints.map((p) => p.y));
  const maxY = Math.max(...projectedPoints.map((p) => p.y));

  const scaleX = maxX - minX || 1;
  const scaleY = maxY - minY || 1;

  const normalizedPoints = projectedPoints.map((p) => ({
    x: ((p.x - minX) / scaleX) * 100,
    y: ((p.y - minY) / scaleY) * 100,
  }));

  // Build the SVG path string
  return normalizedPoints.reduce((path, point, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    return `${path} ${cmd} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, '');
}

export function setFromBasis(
  q: THREE.Quaternion,
  e1: THREE.Vector3,
  e2: THREE.Vector3,
  e3: THREE.Vector3,
): THREE.Quaternion {
  const m11 = e1.x,
    m12 = e1.y,
    m13 = e1.z;
  const m21 = e2.x,
    m22 = e2.y,
    m23 = e2.z;
  const m31 = e3.x,
    m32 = e3.y,
    m33 = e3.z;
  const trace = m11 + m22 + m33;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    q.set(-(m32 - m23) * s, -(m13 - m31) * s, -(m21 - m12) * s, 0.25 / s);
  } else if (m11 > m22 && m11 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
    q.set(-0.25 * s, -(m12 + m21) / s, -(m13 + m31) / s, (m32 - m23) / s);
  } else if (m22 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
    q.set(-(m12 + m21) / s, -0.25 * s, -(m23 + m32) / s, (m13 - m31) / s);
  } else {
    const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
    q.set(-(m13 + m31) / s, -(m23 + m32) / s, -0.25 * s, (m21 - m12) / s);
  }

  q.normalize(); // Always normalize after setting manually
  return q;
}

export function isMobileDevice() {
  return (
    typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

export const isMesh = (obj: THREE.Object3D): obj is THREE.Mesh => {
  return (obj as THREE.Mesh).isMesh === true;
};

export function createTerrainGroup() {
  const group = new THREE.Group();
  group.visible = false;
  return group;
}

export function chunkKey(pos: THREE.Vector2, size: number): string {
  return `${pos.x}_${pos.y}_${size}`;
}

