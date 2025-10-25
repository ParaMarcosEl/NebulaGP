/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
/// <reference lib="webworker" />

console.log('@/workers/Worker loaded -- minimal math physics');

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

  // ADDED: Utility for physics updates (GC-friendly)
  addScaledVector(v: Vector3, s: number) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
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
    // Q_new = Q_current * Q_delta (World space rotation)
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

// === Worker Constants & Local State ===

// Physics constants taken from the main thread controller
const ACCELERATION = 0.01;
const PITCH_VELOCITY = 0.03;
const DAMPING = 0.5;

// --- Local State for physics (Worker owns this) ---
const velocity = new Vector3();
const impulseVelocity = new Vector3();
const angularVelocity = new Vector3();
let speedRef = 0; // The current forward speed
let currentThrottle = 0;
let currentInvertPitch = 1;
let currentPlayerSpeed = 4; // Default max speed
let acceleration = 0.01;
let pitchVelocity = 0.03;
let rollVelocity = 0.06;
let damping = 0.5;

// --- Temporary vectors/quaternions reused every frame (GC-Friendly) ---
const tmpForward = new Vector3(); // Used to calculate forward direction and hold current position
const tmpToWaypoint = new Vector3(); // Used as temporary axis vector (1, 0, 0) or (0, 0, 1)
const tmpQuat = new Quaternion(); // Used as the working copy of the ship's Quaternion (from SAB)
const tmpDeltaQuat = new Quaternion(); // Used for Roll rotation
const tmpPitchQuat = new Quaternion(); // Used for Pitch rotation
const tmpDesiredVelocity = new Vector3(); // Used to calculate target velocity

export interface WorkerPayload {
  type: 'init' | 'update' | 'input' | 'config';
  sharedBuffers?: {
    position: SharedArrayBuffer;
    quaternion: SharedArrayBuffer;
  };
  delta?: number;
  // Input/Config data from the main thread
  inputAxis?: { x: number; y: number }; // x=Roll/Yaw, y=Pitch
  throttle?: number;
  playerSpeed?: number; // Max speed setting
  invertPitch?: number; // Setting
  acceleration?: number;
  pitchVelocity?: number;
  rollVelocity?: number;
  damping?: number;
}

// === State & Setup ===
let isReady = false;
let positionArray: Float32Array;
let quaternionArray: Float32Array;
const messageQueue: MessageEvent<WorkerPayload>[] = [];

// --- Utility ---
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// === Initialization ===
const init = ({
  sharedBuffers,
  playerSpeed,
  invertPitch,
  pitchVelocity: pitch,
  rollVelocity: roll,
  acceleration: accel,
  damping: damp,
}: WorkerPayload) => {
  if (!sharedBuffers) return;
  if (pitch) pitchVelocity = pitch;
  if (roll) rollVelocity = roll;
  if (accel) acceleration = accel;
  if (damp) damping = damp;
  // Use the correct shared buffers
  positionArray = new Float32Array(sharedBuffers.position);
  quaternionArray = new Float32Array(sharedBuffers.quaternion);

  // Initialize local state
  velocity.set(0, 0, 0);
  impulseVelocity.set(0, 0, 0);
  angularVelocity.set(0, 0, 0);
  speedRef = 0;
  currentThrottle = 0;
  currentPlayerSpeed = playerSpeed ?? currentPlayerSpeed;
  currentInvertPitch = invertPitch || 1;

  console.log(`Worker initialized with max speed: ${currentPlayerSpeed}`);
};

// --- Input & Config Handling ---
const handleInput = ({ inputAxis, throttle, playerSpeed, invertPitch }: WorkerPayload) => {
  // Only accumulate input axes for a single frame, damping is applied in update
  if (inputAxis) {
    // The original code was accumulating inputs scaled by delta * 60,
    // which roughly means the input is an acceleration. We'll stick to
    // simple accumulation here, relying on the damping in `update` to stabilize.
    angularVelocity.z += inputAxis.x * rollVelocity; // Roll (X input) affects Z axis
    angularVelocity.x += inputAxis.y * -pitchVelocity; // Pitch (Y input) affects X axis
  }
  if (throttle !== undefined) {
    currentThrottle = throttle;
  }
  if (playerSpeed !== undefined) {
    currentPlayerSpeed = playerSpeed;
  }
  if (invertPitch !== undefined) {
    currentInvertPitch = invertPitch ? -1 : 1;
  }
};

// === Update (GC-Friendly Physics Loop) ===
const update = ({ delta }: WorkerPayload) => {
  // Scale to '60fps' delta multiplier (dt is a scalar)
  const dt = (delta ?? 0.016) * 60;

  // 1. --- ROTATION DAMPING (In-place) ---
  angularVelocity.multiplyScalar(Math.pow(damping, dt));
  if (angularVelocity.length() < 0.001) angularVelocity.set(0, 0, 0);

  // 2. --- ACCELERATION & BRAKING (Scalar) ---
  const accelerating = currentThrottle > 0;
  const braking = currentThrottle < 0;

  if (accelerating) {
    speedRef = Math.min(
      currentPlayerSpeed,
      speedRef + acceleration * Math.abs(currentThrottle) * dt,
    );
  } else if (braking) {
    speedRef = Math.max(
      -currentPlayerSpeed * 0.5,
      speedRef - acceleration * Math.abs(currentThrottle) * dt,
    );
  } else {
    // Smooth deceleration when neither accelerating nor braking
    const dampFactor = 0.98; // tweak for desired smoothness
    speedRef *= Math.pow(dampFactor, dt);
    if (Math.abs(speedRef) < 0.001) speedRef = 0;
  }

  if (Math.abs(speedRef) < 0.001) {
    speedRef = 0;
    velocity.set(0, 0, 0);
  }

  // 3. --- APPLY ROTATION (Reuse temps: tmpQuat, tmpPitchQuat, tmpDeltaQuat) ---
  // --- 3. APPLY ROTATION (Reuse temps: tmpQuat, tmpPitchQuat, tmpDeltaQuat) ---

  // Read the current quaternion into the working temporary object (tmpQuat)
  tmpQuat.set(quaternionArray[0], quaternionArray[1], quaternionArray[2], quaternionArray[3]);

  // tmpQuat already holds current rotation (Q_current)

  // Step 1: compute local axes in world space using tmpForward / tmpToWaypoint
  tmpForward.set(1, 0, 0).applyQuaternion(tmpQuat); // Ship's local X (right)
  tmpToWaypoint.set(0, 0, 1).applyQuaternion(tmpQuat); // Ship's local Z (forward/roll)

  // Step 2: create pitch rotation around local X
  tmpPitchQuat.setFromAxisAngle(tmpForward, angularVelocity.x * currentInvertPitch * dt);

  // Step 3: create roll rotation around local Z
  tmpDeltaQuat.setFromAxisAngle(tmpToWaypoint, angularVelocity.z * dt);

  // Step 4: apply rotations in local space
  tmpQuat.premultiply(tmpDeltaQuat); // Roll
  tmpQuat.premultiply(tmpPitchQuat); // Pitch
  tmpQuat.normalize();

  // 4. --- FORWARD MOVEMENT (Reuse temps: tmpForward, tmpDesiredVelocity) ---

  // Get forward direction from the updated quaternion into tmpForward
  tmpForward.set(0, 0, -1).applyQuaternion(tmpQuat).normalize();

  // Calculate desired velocity into tmpDesiredVelocity
  tmpDesiredVelocity.copy(tmpForward).multiplyScalar(speedRef);

  // Lerp velocity towards desired velocity (In-place)
  const lerpFactor = Math.max(0.05, Math.min(1, Math.abs(speedRef)));
  velocity.lerp(tmpDesiredVelocity, lerpFactor);

  // 5. --- APPLY IMPULSE VELOCITY (In-place) ---
  if (impulseVelocity.length() > 0) {
    velocity.add(impulseVelocity);
    impulseVelocity.multiplyScalar(Math.pow(0.9, dt));
    if (impulseVelocity.length() < 0.01) impulseVelocity.set(0, 0, 0);
  }

  // 6. --- UPDATE POSITION (Reuse tmpForward as a working copy of position) ---

  // Read current position into tmpForward
  tmpForward.set(positionArray[0], positionArray[1], positionArray[2]);

  // Apply velocity (In-place using addScaledVector)
  tmpForward.addScaledVector(velocity, dt);

  // 7. --- WRITE BACK TO SHARED ARRAY BUFFER ---

  // Position
  positionArray[0] = tmpForward.x;
  positionArray[1] = tmpForward.y;
  positionArray[2] = tmpForward.z;

  // Quaternion
  quaternionArray[0] = tmpQuat.x;
  quaternionArray[1] = tmpQuat.y;
  quaternionArray[2] = tmpQuat.z;
  quaternionArray[3] = tmpQuat.w;
};

// === Dispatcher ===
const handleMessage = (e: MessageEvent<WorkerPayload>) => {
  const { type } = e.data;
  if (type === 'init') init(e.data);
  else if (type === 'input' || type === 'config') handleInput(e.data);
  else if (type === 'update') update(e.data);
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
