import * as THREE from 'three';

/**
 * Interface for FBM parameters, matching the uniforms used in the shader.
 */

export interface FBMParams {
  uTime?: number;
  uFrequency: number;
  uAmplitude: number;
  uOctaves: number;
  uLacunarity: number;
  uPersistence: number;
  uExponentiation: number;
  uMaxHeight?: number;
}

/**
 * A utility function to compute the fractional part of a number.
 * @param x The input number.
 * @returns The fractional part.
 */
function fract(x: number): number {
  return x - Math.floor(x);
}

/**
 * A pseudo-random hash function based on the one from the GLSL shader.
 * @param p A 3D vector representing a point in space.
 * @returns A pseudo-random float between 0.0 and 1.0.
 */
function hash(p: THREE.Vector3): number {
  const v = p.clone().multiplyScalar(0.3183099).addScalar(0.1);
  return fract(v.x * v.y * v.z * (v.x + v.y + v.z));
}

/**
 * A noise function based on the GLSL shader's implementation.
 * It interpolates hash values at the corners of a 3D grid cell.
 * @param p A 3D vector representing a point in space.
 * @returns A noise value between 0.0 and 1.0.
 */
function noise(p: THREE.Vector3): number {
  const i = new THREE.Vector3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
  const f = p.clone().sub(i);
  const fade = (t: number) => t * t * (3 - 2 * t);

  const fx = fade(f.x);
  const fy = fade(f.y);
  const fz = fade(f.z);

  const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;

  const n000 = hash(i);
  const n100 = hash(i.clone().add(new THREE.Vector3(1, 0, 0)));
  const n010 = hash(i.clone().add(new THREE.Vector3(0, 1, 0)));
  const n110 = hash(i.clone().add(new THREE.Vector3(1, 1, 0)));
  const n001 = hash(i.clone().add(new THREE.Vector3(0, 0, 1)));
  const n101 = hash(i.clone().add(new THREE.Vector3(1, 0, 1)));
  const n011 = hash(i.clone().add(new THREE.Vector3(0, 1, 1)));
  const n111 = hash(i.clone().add(new THREE.Vector3(1, 1, 1)));

  const x00 = mix(n000, n100, fx);
  const x10 = mix(n010, n110, fx);
  const x01 = mix(n001, n101, fx);
  const x11 = mix(n011, n111, fx);

  const y0 = mix(x00, x10, fy);
  const y1 = mix(x01, x11, fy);

  return mix(y0, y1, fz);
}

/**
 * Calculates Fractal Brownian Motion (FBM) noise.
 * This function aggregates noise from multiple octaves to create complex, organic patterns.
 * @param p The input position vector.
 * @param params The FBM parameters.
 * @returns The final FBM noise value.
 */
export function fbm(p: THREE.Vector3, params: FBMParams): number {
  let total = 0.0;
  let freq = params.uFrequency;
  let amp = params.uAmplitude;
  let maxAmp = 0.0;

  for (let i = 0; i < params.uOctaves; i++) {
    // Add time for animation if provided. The GLSL code uses uTime * 0.05.
    const timeOffset = params.uTime !== undefined ? params.uTime * 0.05 : 0;
    const n = noise(p.clone().multiplyScalar(freq).addScalar(timeOffset));
    total += n * amp;
    maxAmp += amp;
    freq *= params.uLacunarity;
    amp *= params.uPersistence;
  }

  const normalized = total / maxAmp;
  return Math.pow(normalized, params.uExponentiation);
}
