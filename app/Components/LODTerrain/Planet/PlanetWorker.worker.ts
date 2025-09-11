'use client';

/// <reference lib="webworker" />

// import { Vector3 } from 'three';
import { terrainElevationRidged, terrainElevationFBM, FBMParams } from './fbm';

console.log('PlanetWorker loaded');

export type WorkerPayload = {
  posBuffer: SharedArrayBuffer;
  normalBuffer: SharedArrayBuffer;
  uvBuffer: SharedArrayBuffer;
  planetSize: number;
  params: FBMParams;
};

// --- State for Worker Readiness ---
let isReady = false;
const messageQueue: MessageEvent[] = [];

const processBuildChunk = async (
  payload: WorkerPayload & {
    elevationBuffer: SharedArrayBuffer;
    orientation?: { x: number; y: number; z: number; w: number };
    translation?: { x: number; y: number; z: number };
  },
) => {
  const {
    posBuffer,
    normalBuffer,
    uvBuffer,
    elevationBuffer,
    planetSize,
    params,
    orientation,
    translation,
  } = payload;
  const positions = new Float32Array(posBuffer);
  const normals = new Float32Array(normalBuffer);
  const uvs = new Float32Array(uvBuffer);
  const elevations = new Float32Array(elevationBuffer);

  const radius = planetSize;
  const vertexCount = positions.length / 3;
  const rows = Math.sqrt(vertexCount);
  const cols = rows;

  // Helper: rotate a point by quaternion (if orientation supplied)
  const rotateByQuat = (
    px: number,
    py: number,
    pz: number,
    q?: { x: number; y: number; z: number; w: number },
  ) => {
    if (!q) return [px, py, pz];
    // quat * v * quat_conj
    const qx = q.x,
      qy = q.y,
      qz = q.z,
      qw = q.w;
    // t = 2 * cross(q.xyz, v)
    const tx = 2 * (qy * pz - qz * py);
    const ty = 2 * (qz * px - qx * pz);
    const tz = 2 * (qx * py - qy * px);
    // v' = v + qw * t + cross(q.xyz, t)
    const vpx = px + qw * tx + (qy * tz - qz * ty);
    const vpy = py + qw * ty + (qz * tx - qx * tz);
    const vpz = pz + qw * tz + (qx * ty - qy * tx);
    return [vpx, vpy, vpz];
  };

  // --- Precompute raw elevations and displaced positions ---
  const dispArr = new Float32Array(vertexCount * 3);
  const rawElev = new Float32Array(vertexCount);

  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (let y = 0; y < rows; y++) {
    const v = y / (rows - 1);
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < cols; x++) {
      const u = x / (cols - 1);
      const theta = u * Math.PI * 2;

      const px = Math.cos(theta) * sinPhi;
      const py = cosPhi;
      const pz = Math.sin(theta) * sinPhi;

      const disp = params.useRidged
        ? terrainElevationRidged([px, py, pz], params)
        : terrainElevationFBM([px, py, pz], params);

      const r = radius + disp * (params.uMaxHeight ?? 10);

      const ix = (y * cols + x) * 3;
      dispArr[ix] = px * r;
      dispArr[ix + 1] = py * r;
      dispArr[ix + 2] = pz * r;
      rawElev[y * cols + x] = disp;

      // Track min/max elevations
      if (disp < minElevation) minElevation = disp;
      if (disp > maxElevation) maxElevation = disp;
    }
  }

  // --- Fill buffers like before ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const sIdx = idx * 3;

      let vx = dispArr[sIdx];
      let vy = dispArr[sIdx + 1];
      let vz = dispArr[sIdx + 2];

      if (orientation) {
        [vx, vy, vz] = rotateByQuat(vx, vy, vz, orientation);
      }
      if (translation) {
        vx += translation.x;
        vy += translation.y;
        vz += translation.z;
      }

      positions[sIdx] = vx;
      positions[sIdx + 1] = vy;
      positions[sIdx + 2] = vz;

      uvs[idx * 2] = x / (cols - 1);
      uvs[idx * 2 + 1] = 1 - y / (rows - 1);

      elevations[idx] = rawElev[idx];
    }
  }

  //Compute normals using central differences on dispArr (or positions)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const sIdx = idx * 3;

      // neighbor indices with clamping
      const left = (y * cols + Math.max(x - 1, 0)) * 3;
      const right = (y * cols + Math.min(x + 1, cols - 1)) * 3;
      const up = (Math.max(y - 1, 0) * cols + x) * 3;
      const down = (Math.min(y + 1, rows - 1) * cols + x) * 3;

      // tangent vectors
      const txx = dispArr[right] - dispArr[left];
      const txy = dispArr[right + 1] - dispArr[left + 1];
      const txz = dispArr[right + 2] - dispArr[left + 2];

      const tyx = dispArr[down] - dispArr[up];
      const tyy = dispArr[down + 1] - dispArr[up + 1];
      const tyz = dispArr[down + 2] - dispArr[up + 2];

      // normal = cross(tangentX, tangentY)
      let nx = txy * tyz - txz * tyy;
      let ny = txz * tyx - txx * tyz;
      let nz = txx * tyy - txy * tyx;

      // normalize
      const len = Math.hypot(nx, ny, nz) || 1e-9;
      nx /= len;
      ny /= len;
      nz /= len;

      normals[sIdx] = nx;
      normals[sIdx + 1] = ny;
      normals[sIdx + 2] = nz;
    }
  }

  // --- Post result with min/max elevations ---
  self.postMessage({
    type: 'chunk_ready',
    posBuffer,
    normalBuffer,
    uvBuffer,
    elevationBuffer,
    minElevation,
    maxElevation,
  });
};

// --- Flush any queued messages ---
const flushQueue = () => {
  while (messageQueue.length) {
    handleMessage(messageQueue.shift()!);
  }
};

// --- Handle incoming messages ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleMessage = (e: MessageEvent<{ type: string; payload?: any }>) => {
  const { type, payload } = e.data;
  console.log({ type, payload });

  if (type === 'build_chunk' && payload) {
    processBuildChunk(payload);
  }

  if (type === 'ping') {
    console.log('Worker got ping:', payload);
    self.postMessage({ type: 'pong' });
  }
};

// --- Worker lifecycle ---
const markReady = () => {
  isReady = true;
  console.log('PlanetWorker ready');
  self.postMessage({ type: 'ready' });
  flushQueue();
};

self.onmessage = (e) => {
  if (!isReady) {
    messageQueue.push(e);
  } else {
    handleMessage(e);
  }
};

setTimeout(markReady, 0);

// Required for TypeScript worker-loader
export default null as unknown as typeof Worker;
