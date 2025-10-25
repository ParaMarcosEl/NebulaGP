'use client';

/// <reference lib="webworker" />

console.log('@/workers/Worker loaded -- min math');

// === Minimal math classes (No changes here) ===
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
  copy(v: Vector3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  add(v: Vector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  sub(v: Vector3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
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

  premultiply(q: Quaternion) {
    // Q_new = Q_delta * Q_current
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
  } // Added copy method so temporary quaternions can copy state without allocation.

  copy(q: Quaternion) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  setFromAxisAngle(axis: Vector3, angle: number) {
    const halfAngle = angle / 2;
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

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  normalize() {
    let l = this.length();
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

console.log('PlayerSABWorker loaded: Double Buffer System');

// --- 1. Memory Map Constants (MUST MATCH MAIN THREAD) ---

// State Buffer Length: 3 (pos) + 4 (rot) + 3 (vel) + 3 (angVel) = 13 Float32s
const PHYSICS_STATE_FLOAT_COUNT = 13;
const STATE_BUFFER_LENGTH = PHYSICS_STATE_FLOAT_COUNT;

// Control Index: 1 Int32 element
export const CONTROL_INDEX_OFFSET = 0; // Index 0 (Int32)

// Buffer A: 13 Float32 elements
export const BUFFER_A_OFFSET = 1; // Index 1 (Float32/Int32)

// Buffer B: 13 Float32 elements
export const BUFFER_B_OFFSET = BUFFER_A_OFFSET + STATE_BUFFER_LENGTH; // Index 14

// --- 2. Worker Views ---
export interface WorkerPayload {
  type: 'init' | 'update' | 'input' | 'config' | 'impulse';
  sharedBuffer: SharedArrayBuffer;
  delta?: number;
  inputAxis?: { x: number; y: number };
  throttle?: number;
  playerSpeed?: number;
  invertPitch?: number; // Config parameters for the worker to read
  acceleration?: number;
  pitchVelocity?: number;
  rollVelocity?: number;
  damping?: number; // Impulse data
  dampingFactor?: number;
  position?: [number, number, number];
}

// let sabView: Float32Array; // Physics and control constants (up to index 19)
let sabInt32: Int32Array; 
let sabFloat32: Float32Array;

const CONFIG_OFFSET = BUFFER_B_OFFSET + STATE_BUFFER_LENGTH; // = 27

// Local physical state
const pos = new Vector3();
const rot = new Quaternion();
const velocity = new Vector3();
const angularVelocity = new Vector3();
const tmpForward = new Vector3(0, 0, -1);
const tmpRight = new Vector3();
const tmpPitchQuat = new Quaternion();
const tmpRollQuat = new Quaternion();
const tmpDesiredVel = new Vector3();

let isReady = false;
let currentPlayerSpeed = 1;
const messageQueue: MessageEvent<WorkerPayload>[] = [];

// --- Utility (Added isFinite check) ---
function isFinite(x: number) {
    return Number.isFinite(x);
}

// === Initialization (Modified to include Int32Array for the counter) ===
const init = (data: WorkerPayload) => {
    if (!data.sharedBuffer) return;

    // Create the views using the entire buffer passed from the main thread
    sabFloat32 = new Float32Array(data.sharedBuffer); 
    sabInt32 = new Int32Array(data.sharedBuffer); 
//     sabView = sabFloat32; // Used for legacy reference

    // Read the initial state (written by main thread into Buffer A)
    readPhysicsState(BUFFER_A_OFFSET);

    // Read the initial player speed config
    if (data.playerSpeed !== undefined) currentPlayerSpeed = data.playerSpeed;

    markReady();
};

// --- RESTORED READINESS LOGIC ---

const flushQueue = () => {
  while (messageQueue.length) {
    handleMessage(messageQueue.shift()!);
  }
};

const markReady = () => {
  isReady = true;
  console.log('Worker ready');
  self.postMessage({ type: 'ready' });
  flushQueue();
};

// === Input & Config Handling ===
const handleInput = (data: WorkerPayload) => {
  // Only read config/speed changes here. Inputs are read directly in `update`.
  if (data.playerSpeed !== undefined) currentPlayerSpeed = data.playerSpeed;
  // Note: Other config (accel, vel, damp) is already written to CONFIG_OFFSET by main thread.
};

const handleImpulse = ({ dampingFactor = 0.5 }: WorkerPayload) => {
    // Only apply impulse to local state and update the next committed buffer.
    velocity.multiplyScalar(dampingFactor);
    angularVelocity.multiplyScalar(dampingFactor);
};

// Helper to read the full state (13 floats) from a given buffer offset
function readPhysicsState(offset: number) {
    if (!sabFloat32) return;
    pos.set(sabFloat32[offset + 0], sabFloat32[offset + 1], sabFloat32[offset + 2]);
    rot.set(sabFloat32[offset + 3], sabFloat32[offset + 4], sabFloat32[offset + 5], sabFloat32[offset + 6]);
    velocity.set(sabFloat32[offset + 7], sabFloat32[offset + 8], sabFloat32[offset + 9]);
    angularVelocity.set(sabFloat32[offset + 10], sabFloat32[offset + 11], sabFloat32[offset + 12]);
}

// Helper to write the full state (13 floats) to a given buffer offset
function writePhysicsState(offset: number) {
    if (!sabFloat32) return;
    sabFloat32[offset + 0] = pos.x;
    sabFloat32[offset + 1] = pos.y;
    sabFloat32[offset + 2] = pos.z;
    sabFloat32[offset + 3] = rot.x;
    sabFloat32[offset + 4] = rot.y;
    sabFloat32[offset + 5] = rot.z;
    sabFloat32[offset + 6] = rot.w;
    sabFloat32[offset + 7] = velocity.x;
    sabFloat32[offset + 8] = velocity.y;
    sabFloat32[offset + 9] = velocity.z;
    sabFloat32[offset + 10] = angularVelocity.x;
    sabFloat32[offset + 11] = angularVelocity.y;
    sabFloat32[offset + 12] = angularVelocity.z;
}

const handleCollision = ({ position = [0, 0, 0], dampingFactor = 0.98 }: WorkerPayload) => {
    // 1. Read the CURRENT active buffer index
    const activeBufferIndex = Atomics.load(sabInt32, CONTROL_INDEX_OFFSET);
    
    // 2. Determine the INACTIVE buffer offset (the one we can safely write the correction to)
    const inactiveBufferIndex = 1 - activeBufferIndex;
    const inactiveOffset = inactiveBufferIndex === 0 ? BUFFER_A_OFFSET : BUFFER_B_OFFSET;

    // 3. Update the local state (this is the simplest way to apply the correction)
    pos.set(position[0], position[1], position[2]);
    velocity.multiplyScalar(dampingFactor);
    angularVelocity.multiplyScalar(dampingFactor);

    // 4. Write the corrected physics state into the INACTIVE buffer
    writePhysicsState(inactiveOffset);
    
    // 5. Atomically flip the control index to make the corrected state active
    Atomics.store(sabInt32, CONTROL_INDEX_OFFSET, inactiveBufferIndex);
};

// --- Core Update Logic with Stability Checks ---
function update({ delta }: WorkerPayload) {

    if (!sabInt32) return; 
    console.log({sabFloat32})
    // --- 1. State/Buffer Management ---
    const activeBufferIndex = Atomics.load(sabInt32, CONTROL_INDEX_OFFSET);
    const inactiveBufferIndex = 1 - activeBufferIndex;
    const inactiveOffset = inactiveBufferIndex === 0 ? BUFFER_A_OFFSET : BUFFER_B_OFFSET;

    // --- 2. Read Inputs/Constants from CONFIG_OFFSET ---
    const accel = sabFloat32[CONFIG_OFFSET + 0];
    const pitchVel = sabFloat32[CONFIG_OFFSET + 1];
    const rollVel = sabFloat32[CONFIG_OFFSET + 2];
    const damping = sabFloat32[CONFIG_OFFSET + 3];
    const throttle = sabFloat32[CONFIG_OFFSET + 4]; // INPUT
    const inputX = sabFloat32[CONFIG_OFFSET + 5];   // INPUT
    const inputY = sabFloat32[CONFIG_OFFSET + 6];   // INPUT

    // --- 3. Physics Step (Using local state) ---
    const rawDelta = delta || (1 / 60);
    const dt = rawDelta * 60; // Scale delta for frame rate independence (dt is 1.0 at 60fps)

    // Rotation
    angularVelocity.x = inputY * pitchVel;
    angularVelocity.z = inputX * rollVel;

    // Apply Damping
    angularVelocity.multiplyScalar(Math.pow(damping, dt));

    // Update Speed (Thrust)
    let speed = velocity.length();
    const maxSpeed = currentPlayerSpeed;
    const maxBrakeSpeed = -maxSpeed * 0.5;

    if (throttle > 0) {
        speed = Math.min(speed + accel * throttle * dt, maxSpeed);
    } else if (throttle < 0) {
        speed = Math.max(speed + accel * throttle * dt, maxBrakeSpeed);
    } else {
        speed *= Math.pow(0.98, dt); // Drag
    }

    // Apply Rotation to Position (Calculates local axes)
    tmpRight.set(1, 0, 0).applyQuaternion(rot);
    tmpForward.set(0, 0, 1).applyQuaternion(rot);

    // 🛑 FIX 1: Normalize local axes before quaternion math 🛑
    tmpRight.normalize();
    tmpForward.normalize();
    
    // Calculate and apply rotation deltas
    tmpPitchQuat.setFromAxisAngle(tmpRight, angularVelocity.x * dt);
    tmpRollQuat.setFromAxisAngle(tmpForward, angularVelocity.z * dt);
    rot.premultiply(tmpRollQuat).premultiply(tmpPitchQuat).normalize(); // Final normalize is crucial

    // Update Velocity Vector
    tmpForward.set(0, 0, -1).applyQuaternion(rot);
    tmpDesiredVel.copy(tmpForward).multiplyScalar(speed);
    
    // Use scaled DT for lerp factor to maintain frame rate independence
    velocity.lerp(tmpDesiredVel, Math.max(0.05, Math.abs(speed)) * dt);

    // Integrate Position
    tmpDesiredVel.copy(velocity).multiplyScalar(rawDelta);
    pos.add(tmpDesiredVel);

    // 🛑 FIX 2: CRITICAL NUMERICAL STABILITY WATCHDOG 🛑
    // Check if any critical state value has become non-finite (NaN or Infinity)
    if (
        !isFinite(pos.x) || !isFinite(rot.x) || 
        !isFinite(velocity.x) || rot.length() > 1.01 
    ) {
        console.error("NUMERICAL INSTABILITY DETECTED: pos/rot/vel", {
          posX: pos.x, posY: pos.y, posZ: pos.z,
          rotX: rot.x, rotY: rot.y, rotZ: rot.z, rotW: rot.w,
          velX: velocity.x, velY: velocity.y, velZ: velocity.z,
          dt, rawDelta
        });
        // Reset local state to a safe identity position
        pos.set(0, 0, 0);
        rot.set(0, 0, 0, 1);
        velocity.set(0, 0, 0);
        angularVelocity.set(0, 0, 0);
        // Force the reset into the inactive buffer before the flip
        writePhysicsState(inactiveOffset);
        // Do not proceed with writing the corrupted state
    } else {
        // Write back to INACTIVE buffer ONLY if state is stable
        writePhysicsState(inactiveOffset);
    }
    
    // --- 5. Atomically flip the control index ---
    Atomics.store(sabInt32, CONTROL_INDEX_OFFSET, inactiveBufferIndex);
}

// === Dispatcher ===
const handleMessage = (e: MessageEvent<WorkerPayload>) => {
  const { type } = e.data;

  if (type === 'init') {
    init(e.data);
  } else if (type === 'update') {
    update(e.data);
  } else if (type === 'input' || type === 'config') {
    handleInput(e.data);
  } else if (type === 'impulse') {
    handleImpulse(e.data);
  } else if ( type == 'collision') {
    handleCollision(e.data);
  }
};

// Global onmessage handler queues messages if worker is not yet ready,
// otherwise handles them directly.
self.onmessage = (e: MessageEvent<WorkerPayload>) => {
  if (!isReady) {
    messageQueue.push(e);
  } else {
    handleMessage(e);
  }
};

// Set a timeout to mark the worker ready immediately after the initial script execution finishes
setTimeout(() => {
  if (!isReady) {
    markReady();
  }
}, 0);

export default null as unknown as typeof Worker;
