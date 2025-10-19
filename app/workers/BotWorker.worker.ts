/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
/// <reference lib="webworker" />

console.log('@/workers/BotWorker loaded -- min math');

// --- Minimal math classes ---
class Vector3 {
  x = 0; y = 0; z = 0;

  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }

  set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  sub(v: Vector3) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  add(v: Vector3) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  multiplyScalar(s: number) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() { const l = this.length(); if (l > 0) this.multiplyScalar(1 / l); return this; }
  
  applyQuaternion(q: Quaternion) {
    const x = this.x, y = this.y, z = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

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
  x = 0; y = 0; z = 0; w = 1;

  set(x: number, y: number, z: number, w: number) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }

  multiply(q: Quaternion) {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    this.x = w*q.x + x*q.w + y*q.z - z*q.y;
    this.y = w*q.y - x*q.z + y*q.w + z*q.x;
    this.z = w*q.z + x*q.y - y*q.x + z*q.w;
    this.w = w*q.w - x*q.x - y*q.y - z*q.z;
    return this;
  }

  clone() { return new Quaternion().set(this.x, this.y, this.z, this.w); }

  setFromAxisAngle(axis: Vector3, angle: number) {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const v = axis.clone().normalize().multiplyScalar(s);
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = Math.cos(halfAngle);
    return this;
  }

  normalize() {
    let l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (l === 0) {
      this.x = 0; this.y = 0; this.z = 0; this.w = 1;
    } else {
      l = 1 / l;
      this.x *= l; this.y *= l; this.z *= l; this.w *= l;
    }
    return this;
  }
}

// === Constants ===
const PITCH_TORQUE = -1.5;
const ROLL_TORQUE = 6;
const WAYPOINT_RADIUS = 50;
const FIRE_COOLDOWN_MS = 200;
const MINE_DROP_COOLDOWN_MS = 1500;

const LOCAL_PITCH_AXIS = new Vector3(1, 0, 0);
const LOCAL_ROLL_AXIS = new Vector3(0, 0, 1);

// === Types ===
export interface BotInit {
  id: number;
  speed: number;
  currentT: number;
  waypointIndex: number;
  cannonValue: number;
  useMine: boolean;
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

export interface BotUpdate { id: number; fire?: boolean; dropMine?: boolean; }

export interface BotWorkerPayload {
  type: 'init' | 'update';
  bots?: BotInit[];
  sharedBuffers?: {
    position: SharedArrayBuffer;
    quaternion: SharedArrayBuffer;
  };
  waypoints?: number[];
  delta?: number;
}

// === State ===
let isReady = false;
let bots: BotInit[] = [];
let numBots = 0;
let positionArray: Float32Array;
let quaternionArray: Float32Array;
let waypoints: Vector3[] = [];

const messageQueue: MessageEvent<BotWorkerPayload>[] = [];

const lastFireTime: Record<number, number> = {};
const lastMineTime: Record<number, number> = {};

// === Temp vectors ===
const tmpForward = new Vector3();
const tmpUp = new Vector3();
const tmpToWaypoint = new Vector3();
const tmpQuat = new Quaternion();
const tmpDeltaQuat = new Quaternion();

// --- Utility ---
function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }

function computeRollInput(forward: Vector3, toTarget: Vector3, up: Vector3) {
  const rightX = up.y*forward.z - up.z*forward.y;
  const rightY = up.z*forward.x - up.x*forward.z;
  const rightZ = up.x*forward.y - up.y*forward.x;
  const dot = rightX*toTarget.x + rightY*toTarget.y + rightZ*toTarget.z;
  return clamp(dot, -1, 1);
}

function computePitchInput(forward: Vector3, toTarget: Vector3, up: Vector3) {
  const axisX = forward.y*toTarget.z - forward.z*toTarget.y;
  const axisY = forward.z*toTarget.x - forward.x*toTarget.z;
  const axisZ = forward.x*toTarget.y - forward.y*toTarget.x;
  const upCrossX = up.y*forward.z - up.z*forward.y;
  const upCrossY = up.z*forward.x - up.x*forward.z;
  const upCrossZ = up.x*forward.y - up.y*forward.x;
  const dot = axisX*upCrossX + axisY*upCrossY + axisZ*upCrossZ;
  return clamp(dot, -1, 1);
}

// === Initialization ===
const initBots = ({ bots: msgBots, sharedBuffers, waypoints: wpFlat }: BotWorkerPayload) => {
  if (!msgBots || !sharedBuffers) return;

  bots = msgBots;
  numBots = bots.length;

  positionArray = new Float32Array(sharedBuffers.position);
  quaternionArray = new Float32Array(sharedBuffers.quaternion);

  for (let i = 0; i < numBots; i++) {
    const p = i * 3;
    const q = i * 4;
    const b = bots[i];

    positionArray[p] = b.position?.[0] ?? 0;
    positionArray[p + 1] = b.position?.[1] ?? 0;
    positionArray[p + 2] = b.position?.[2] ?? 0;

    quaternionArray[q] = b.quaternion?.[0] ?? 0;
    quaternionArray[q + 1] = b.quaternion?.[1] ?? 0;
    quaternionArray[q + 2] = b.quaternion?.[2] ?? 0;
    quaternionArray[q + 3] = b.quaternion?.[3] ?? 1;
  }

  waypoints = [];
  if (wpFlat) {
    for (let i = 0; i < wpFlat.length; i += 3) {
      waypoints.push(new Vector3(wpFlat[i], wpFlat[i + 1], wpFlat[i + 2]));
    }
  }

  console.log(`BotWorker initialized with ${numBots} bots and ${waypoints.length} waypoints`);
};

// === Update ===
const updateBots = ({ delta }: BotWorkerPayload) => {
  const dt = delta ?? 0.016;

  for (let i = 0; i < numBots; i++) {
    const bot = bots[i];
    const p = i * 3, q = i * 4;

    tmpQuat.set(quaternionArray[q], quaternionArray[q + 1], quaternionArray[q + 2], quaternionArray[q + 3]);

    tmpForward.set(0, 0, -1).applyQuaternion(tmpQuat);
    tmpUp.set(0, 1, 0).applyQuaternion(tmpQuat);

    // ✅ Corrected: compute direction TO the waypoint (target - position)
    const wp = waypoints[bot.waypointIndex];
    tmpToWaypoint.set(wp.x - positionArray[p], wp.y - positionArray[p + 1], wp.z - positionArray[p + 2]);

    if (tmpToWaypoint.length() < WAYPOINT_RADIUS) {
      bot.waypointIndex++;
      
      // If we've reached the final checkpoint, reset to start
      if (bot.waypointIndex >= waypoints.length) bot.waypointIndex = 5;

      const next = waypoints[bot.waypointIndex];
      tmpToWaypoint.set(next.x - positionArray[p], next.y - positionArray[p + 1], next.z - positionArray[p + 2]);
    }

    tmpToWaypoint.normalize();

    const pitchInput = computePitchInput(tmpForward, tmpToWaypoint, tmpUp) * PITCH_TORQUE;
    const rollInput = computeRollInput(tmpForward, tmpToWaypoint, tmpUp) * ROLL_TORQUE;

    tmpDeltaQuat.setFromAxisAngle(LOCAL_PITCH_AXIS, pitchInput * dt);
    tmpQuat.multiply(tmpDeltaQuat);

    tmpDeltaQuat.setFromAxisAngle(LOCAL_ROLL_AXIS, rollInput * dt);
    tmpQuat.multiply(tmpDeltaQuat);
    tmpQuat.normalize();

    tmpForward.set(0, 0, -1).applyQuaternion(tmpQuat);
    tmpForward.multiplyScalar(bot.speed * dt);

    positionArray[p] += tmpForward.x;
    positionArray[p + 1] += tmpForward.y;
    positionArray[p + 2] += tmpForward.z;

    quaternionArray[q] = tmpQuat.x;
    quaternionArray[q + 1] = tmpQuat.y;
    quaternionArray[q + 2] = tmpQuat.z;
    quaternionArray[q + 3] = tmpQuat.w;
  }
};

// === Dispatcher ===
const handleMessage = (e: MessageEvent<BotWorkerPayload>) => {
  const { type } = e.data;
  if (type === 'init') initBots(e.data);
  if (type === 'update') updateBots(e.data);
};

const flushQueue = () => { while (messageQueue.length) handleMessage(messageQueue.shift()!); };

const markReady = () => {
  isReady = true;
  console.log('BotWorker ready');
  self.postMessage({ type: 'ready' });
  flushQueue();
};

self.onmessage = (e: MessageEvent<BotWorkerPayload>) => {
  if (!isReady) messageQueue.push(e);
  else handleMessage(e);
};

setTimeout(markReady, 0);

export default null as unknown as typeof Worker;
