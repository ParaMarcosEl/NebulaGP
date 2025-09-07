import * as THREE from 'three';

/**
 * Interface for FBM parameters, matching the uniforms used in the shader.
 */
export interface FBMParams {
  uTime: number;
  uFrequency: number;
  uAmplitude: number;
  uOctaves: number;
  uLacunarity: number;
  uPersistence: number;
  uExponentiation: number;
  uMaxHeight?: number;
  useRidged?: boolean; // ✅ Fixed typo
}

/** Fractional part utility */
function fract(x: number): number {
  return x - Math.floor(x);
}

/** Hash for pseudo-random noise */
function hash(p: THREE.Vector3): number {
  const v = p.clone().multiplyScalar(0.3183099).addScalar(0.1);
  return fract(v.x * v.y * v.z * (v.x + v.y + v.z));
}

/** Value noise with smooth interpolation */
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

/** Convert array coords to Vector3 and call noise() */
function noiseArray(p: [number, number, number]): number {
  return noise(new THREE.Vector3(...p));
}

/** Ridge shaping function */
function ridge(n: number): number {
  n = Math.abs(n);
  n = 1.0 - n;
  return n * n;
}

/** Standard FBM (smooth terrain) */
function fbmStandard(
  p: [number, number, number],
  freq: number,
  lacunarity: number,
  persistence: number,
  octaves: number,
  noiseFn: (p: [number, number, number]) => number
): number {
  let sum = 0;
  let amp = 0.5;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    sum += noiseFn([p[0] * f, p[1] * f, p[2] * f]) * amp;
    f *= lacunarity;
    amp *= persistence;
  }
  return sum;
}

/** Ridged FBM (rugged terrain) */
function ridgedFBM(
  p: [number, number, number],
  freq: number,
  lacunarity: number,
  persistence: number,
  octaves: number,
  noiseFn: (p: [number, number, number]) => number
): number {
  let sum = 0;
  let amp = 0.5;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    sum += ridge(noiseFn([p[0] * f, p[1] * f, p[2] * f])) * amp;
    f *= lacunarity;
    amp *= persistence;
  }
  return sum;
}

/** Smooth terrain elevation */
export function terrainElevationFBM(
  pos: [number, number, number],
  params: FBMParams,
  noiseFn = noiseArray
): number {
  const { uFrequency, uLacunarity, uPersistence, uOctaves, uExponentiation } = params;
  const elevation = fbmStandard(pos, uFrequency, uLacunarity, uPersistence, uOctaves, noiseFn);
  return Math.pow(elevation, uExponentiation);
}

/** Ridged terrain elevation */
export function terrainElevationRidged(
  pos: [number, number, number],
  params: FBMParams,
  noiseFn = noiseArray
): number {
  const { uFrequency, uLacunarity, uPersistence, uOctaves, uExponentiation } = params;

  const base = ridgedFBM(pos, uFrequency, uLacunarity, uPersistence, uOctaves, noiseFn);

  const warp = [
    noiseFn([pos[0] * 0.5, pos[1] * 0.5, pos[2] * 0.5]),
    noiseFn([pos[0] * 0.5 + 100, pos[1] * 0.5, pos[2] * 0.5]),
    noiseFn([pos[0] * 0.5, pos[1] * 0.5 + 200, pos[2] * 0.5]),
  ];
  const warpedPos: [number, number, number] = [
    pos[0] + warp[0] * 0.3,
    pos[1] + warp[1] * 0.3,
    pos[2] + warp[2] * 0.3,
  ];

  const detail = ridgedFBM(
    warpedPos,
    uFrequency * 2.5,
    uLacunarity,
    uPersistence,
    Math.max(3, Math.floor(uOctaves / 2)),
    noiseFn
  );

  return Math.pow(base + detail * 0.3, uExponentiation);
}
