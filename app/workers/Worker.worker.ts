/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
/// <reference lib="webworker" />

console.log('@/workers/Worker loaded -- min math');

// === Minimal math classes (Restored and Added methods) ===
class Vector3 {
  x = 0;
  y = 0;
  z = 0;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  sub(v: Vector3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  add(v: Vector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  multiplyScalar(s: number) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  normalize() {
    const l = this.length();
    if (l > 0) this.multiplyScalar(1 / l);
    return this;
  }
  // ADDED: Simple copy method
  copy(v: Vector3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  // ADDED: Lerp method for smooth velocity transitions (acceleration)
  lerp(v: Vector3, alpha: number) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }

  applyQuaternion(q: Quaternion) {
    const x = this.x,
      y = this.y,
      z = this.z;
    const qx = q.x,
      qy = q.y,
      qz = q.z,
      qw = q.w;

    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    return this;
  }
}

class Quaternion {
  x = 0;
  y = 0;
  z = 0;
  w = 1;

  set(x: number, y: number, z: number, w: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  multiply(q: Quaternion) {
    // Q_new = Q_current * Q_delta
    const x = this.x,
      y = this.y,
      z = this.z,
      w = this.w;
    const qx = q.x,
      qy = q.y,
      qz = q.z,
      qw = q.w;
    this.x = w * qx + x * qw + y * qz - z * qy;
    this.y = w * qy - x * qz + y * qw + z * qx;
    this.z = w * qz + x * qy - y * qx + z * qw;
    this.w = w * qw - x * qx - y * qy - z * qz;
    return this;
  }

  // ADDED: Premultiply for correct local rotation: Q_new = Q_delta * Q_current
  premultiply(q: Quaternion) {
    const x = this.x,
      y = this.y,
      z = this.z,
      w = this.w;
    const qx = q.x,
      qy = q.y,
      qz = q.z,
      qw = q.w;

    this.x = qx * w + qw * x + qy * z - qz * y;
    this.y = qy * w + qw * y + qz * x - qx * z;
    this.z = qz * w + qw * z + qx * y - qy * x;
    this.w = qw * w - qx * x - qy * y - qz * z;
    return this;
  }

  clone() {
    return new Quaternion().set(this.x, this.y, this.z, this.w);
  }

  setFromAxisAngle(axis: Vector3, angle: number) {
    const halfAngle = angle / 2;
    // FIX: Normalize axis inside if it isn't already
    const l = axis.length();
    if (l === 0) {
      this.set(0, 0, 0, 1);
      return this;
    }
    const s = Math.sin(halfAngle) / l;

    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);
    return this;
  }

  normalize() {
    let l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (l === 0) {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
    } else {
      l = 1 / l;
      this.x *= l;
      this.y *= l;
      this.z *= l;
      this.w *= l;
    }
    return this;
  }
}

// === Constants ===

// --- Runtime per-bot state (velocity + impulse) ---

// --- Temporary vectors/quaternions reused every frame ---
const tmpForward = new Vector3();
const tmpUp = new Vector3();
const tmpToWaypoint = new Vector3();
const tmpQuat = new Quaternion();
const tmpDeltaQuat = new Quaternion(); // Used for orientation
const tmpPitchQuat = new Quaternion();
const tmpRollQuat = new Quaternion();
const tmpDesiredVelocity = new Vector3();

export interface WorkerPayload {
  type: 'init' | 'update';
  sharedBuffers?: {
    position: SharedArrayBuffer;
    quaternion: SharedArrayBuffer;
  };
  delta?: number;
} // Assume correct

// === State (omitted for brevity, assume they are correct) ===
let isReady = false;
let positionArray: Float32Array;
let quaternionArray: Float32Array;
const messageQueue: MessageEvent<WorkerPayload>[] = [];

// --- Utility ---
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// === Initialization ===
const init = ({ sharedBuffers }: WorkerPayload) => {
  if (!sharedBuffers) return;

  positionArray = new Float32Array(sharedBuffers.position);
  quaternionArray = new Float32Array(sharedBuffers.quaternion);

  console.log(`Worker initialized`);
};

// === Update ===
const update = ({ delta }: WorkerPayload) => {
  //   const dt = delta ?? 0.016;
  //update physics, etc...
  console.log({ positionArray, quaternionArray });
};

// === Dispatcher (omitted for brevity, remains the same) ===
const handleMessage = (e: MessageEvent<WorkerPayload>) => {
  const { type } = e.data;
  if (type === 'init') init(e.data);
  if (type === 'update') update(e.data);
};

const flushQueue = () => {
  while (messageQueue.length) handleMessage(messageQueue.shift()!);
};

const markReady = () => {
  isReady = true;
  console.log('Worker ready');
  self.postMessage({ type: 'ready' });
  flushQueue();
};

self.onmessage = (e: MessageEvent<WorkerPayload>) => {
  if (!isReady) messageQueue.push(e);
  else handleMessage(e);
};

setTimeout(markReady, 0);

export default null as unknown as typeof Worker;
