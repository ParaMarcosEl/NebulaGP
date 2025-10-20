/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
/// <reference lib="webworker" />

console.log('@/workers/BotWorker loaded -- min math');

// === Minimal math classes (Restored and Added methods) ===
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
  
    // ADDED: Simple copy method
    copy(v: Vector3) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }

    // ADDED: Lerp method for smooth velocity transitions (acceleration)
    lerp(v: Vector3, alpha: number) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;
        return this;
    }

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

  multiply(q: Quaternion) { // Q_new = Q_current * Q_delta
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    this.x = w*qx + x*qw + y*qz - z*qy;
    this.y = w*qy - x*qz + y*qw + z*qx;
    this.z = w*qz + x*qy - y*qx + z*qw;
    this.w = w*qw - x*qx - y*qy - z*qz;
    return this;
  }

    // ADDED: Premultiply for correct local rotation: Q_new = Q_delta * Q_current
    premultiply(q: Quaternion) {
        const x = this.x, y = this.y, z = this.z, w = this.w;
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

        this.x = qx * w + qw * x + qy * z - qz * y;
        this.y = qy * w + qw * y + qz * x - qx * z;
        this.z = qz * w + qw * z + qx * y - qy * x;
        this.w = qw * w - qx * x - qy * y - qz * z;
        return this;
    }

  clone() { return new Quaternion().set(this.x, this.y, this.z, this.w); }

  setFromAxisAngle(axis: Vector3, angle: number) {
    const halfAngle = angle / 2;
    // FIX: Normalize axis inside if it isn't already
    const l = axis.length();
    if (l === 0) { this.set(0, 0, 0, 1); return this; }
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

const NORMALIZE_EVERY_N_FRAMES = 60;
const MAX_SPEED = 50;
const ACCELERATION_FACTOR = 5.0; // Factor used in Lerp, controls how quickly speed changes

// --- Runtime per-bot state (velocity + impulse) ---
interface BotRuntimeState {
  velocity: Vector3;
  impulseVelocity: Vector3;
}
const botStates: Record<number, BotRuntimeState> = {};
const speedRef: Record<number, number> = {};
const frameCounter: { current: number } = { current: 0 };


// --- Temporary vectors/quaternions reused every frame ---
const tmpForward = new Vector3();
const tmpUp = new Vector3();
const tmpToWaypoint = new Vector3();
const tmpQuat = new Quaternion(); 
const tmpDeltaQuat = new Quaternion(); // Used for current orientation
const tmpPitchQuat = new Quaternion(); // ADDED
const tmpRollQuat = new Quaternion(); // ADDED
const tmpDesiredVelocity = new Vector3(); // ADDED

// === Call this during initBots or after bots array is ready ===
function initBotStates() {
  bots.forEach(bot => {
    if (!botStates[bot.id]) {
      botStates[bot.id] = {
        velocity: new Vector3(),
        impulseVelocity: new Vector3(),
      };
    }
  });
}

// === Types (omitted for brevity, assume they are correct) ===
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

export interface BotWorkerPayload  {
    type: 'init' | 'update';
    bots?: BotInit[];
    sharedBuffers?: {
        position: SharedArrayBuffer;
        quaternion: SharedArrayBuffer;
    };
    waypoints?: number[];
    delta?: number;
} // Assume correct

// === State (omitted for brevity, assume they are correct) ===
let isReady = false;
let bots: BotInit[] = [];
let numBots = 0;
let positionArray: Float32Array;
let quaternionArray: Float32Array;
let waypoints: Vector3[] = [];
const messageQueue: MessageEvent<BotWorkerPayload>[] = [];
const lastFireTime: Record<number, number> = {};
const lastMineTime: Record<number, number> = {};


// --- Utility ---
function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }

// FIX: Corrected roll calculation to use Forward x Up = Right
function computeRollInput(forward: Vector3, toTarget: Vector3, up: Vector3) {
  // Local Right vector: Forward x Up
  const rightX = forward.y * up.z - forward.z * up.y;
  const rightY = forward.z * up.x - forward.x * up.z;
  const rightZ = forward.x * up.y - forward.y * up.x;
  
  // Dot product of (local Right) and (direction to target)
  const dot = rightX * toTarget.x + rightY * toTarget.y + rightZ * toTarget.z;
  return clamp(dot, -1, 1);
}

// Pitch logic remains the same (it seems to work as intended for input)
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

    initBotStates(); // FIX: Initialize bot states

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
  frameCounter.current++;

  for (let i = 0; i < numBots; i++) {
    const bot = bots[i];
    const p = i * 3, q = i * 4;
    const state = botStates[bot.id]; // Get bot state

    // 1. Load current quaternion (Q_current)
    tmpDeltaQuat.set(quaternionArray[q], quaternionArray[q + 1], quaternionArray[q + 2], quaternionArray[q + 3]);

    // 2. Calculate Forward/Up from Q_current for input calculation
    tmpForward.set(0, 0, -1).applyQuaternion(tmpDeltaQuat);
    tmpUp.set(0, 1, 0).applyQuaternion(tmpDeltaQuat);

    // 3. Direction to waypoint (tmpToWaypoint)
    const wp = waypoints[bot.waypointIndex];
    tmpToWaypoint.set(wp.x - positionArray[p], wp.y - positionArray[p + 1], wp.z - positionArray[p + 2]);

    if (tmpToWaypoint.length() < WAYPOINT_RADIUS) {
      bot.waypointIndex++; // FIX: Use modulo for loop
      if (bot.waypointIndex >= waypoints.length) bot.waypointIndex = 0;
      
      const next = waypoints[bot.waypointIndex];
      tmpToWaypoint.set(next.x - positionArray[p], next.y - positionArray[p + 1], next.z - positionArray[p + 2]);
    }

    tmpToWaypoint.normalize();

    // 4. Speed Adjustment & Punishment Logic
    const angleDot = tmpForward.x * tmpToWaypoint.x +
                  tmpForward.y * tmpToWaypoint.y +
                  tmpForward.z * tmpToWaypoint.z;

    if (!(bot.id in speedRef)) speedRef[bot.id] = bot.speed;
    
    // Punishment: Speed is penalized if angleDot is low (bot is facing away)
    // Interpolate speed between 50% (angleDot = -1) and 100% (angleDot = 1)
    let speedMultiplier = clamp((angleDot + 1) / 2, 0.5, 1.0); // Minimum 50% speed
    
    // Further slow down if extremely misaligned (optional, but good for course correction)
    if (angleDot < 0) speedMultiplier *= 0.75; 
    
    speedRef[bot.id] = bot.speed * speedMultiplier;

    // 5. Rotation (Banking/Following)
    // Calculate pitch and roll required to align with waypoint
    const pitchAngle = computePitchInput(tmpForward, tmpToWaypoint, tmpUp) * PITCH_TORQUE * dt;
    const rollAngle = computeRollInput(tmpForward, tmpToWaypoint, tmpUp) * ROLL_TORQUE * dt;

    // Create delta quaternions
    tmpPitchQuat.setFromAxisAngle(LOCAL_PITCH_AXIS, pitchAngle);
    tmpRollQuat.setFromAxisAngle(LOCAL_ROLL_AXIS, rollAngle);
    
    // Apply local rotation (premultiply: Q_new = Q_delta * Q_current)
    // Roll usually applied before Pitch in local space controls for desired effect
    tmpDeltaQuat.premultiply(tmpRollQuat);
    tmpDeltaQuat.premultiply(tmpPitchQuat);

    if (frameCounter.current % NORMALIZE_EVERY_N_FRAMES === 0) tmpDeltaQuat.normalize();
    
    // 6. Translation/Velocity (Acceleration Logic)
    
    // Recalculate tmpForward with the NEW orientation (Q_new)
    tmpForward.set(0, 0, -1).applyQuaternion(tmpDeltaQuat);

    // Calculate desired velocity vector based on new direction and adjusted speed
    tmpDesiredVelocity.copy(tmpForward).multiplyScalar(speedRef[bot.id]);

    // Apply acceleration/smoothing (Lerp)
    // Lerp factor dictates acceleration: higher factor means quicker change (less time to accelerate)
    const lerpFactor = clamp(ACCELERATION_FACTOR * dt, 0, 1);
    state.velocity.lerp(tmpDesiredVelocity, lerpFactor);
    
    // Apply and decay impulse
    state.velocity.add(state.impulseVelocity);
    state.impulseVelocity.multiplyScalar(0.9);

    // Cap Speed
    if (state.velocity.length() > MAX_SPEED) {
        state.velocity.normalize().multiplyScalar(MAX_SPEED);
    }
    
    // 7. Write results to SharedArrayBuffer
    positionArray[p] += state.velocity.x * dt;
    positionArray[p + 1] += state.velocity.y * dt;
    positionArray[p + 2] += state.velocity.z * dt;

    quaternionArray[q] = tmpDeltaQuat.x;
    quaternionArray[q + 1] = tmpDeltaQuat.y;
    quaternionArray[q + 2] = tmpDeltaQuat.z;
    quaternionArray[q + 3] = tmpDeltaQuat.w;

    // 8. Weapons (omitted for brevity, remains the same)
    const nowMs = performance.now();
    if (bot.cannonValue > 0 && (!lastFireTime[bot.id] || nowMs - lastFireTime[bot.id] > FIRE_COOLDOWN_MS)) {
        self.postMessage({ type: 'fire', id: bot.id });
        lastFireTime[bot.id] = nowMs;
    }
    if (bot.useMine && (!lastMineTime[bot.id] || nowMs - lastMineTime[bot.id] > MINE_DROP_COOLDOWN_MS)) {
        self.postMessage({ type: 'dropMine', id: bot.id });
        bot.useMine = false;
        lastMineTime[bot.id] = nowMs;
    }
  }
};

// === Dispatcher (omitted for brevity, remains the same) ===
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