'use client';

/// <reference lib="webworker" />

console.log('@/workers/Worker loaded -- min math');

import {
  terrainElevationRidged,
  terrainElevationFBM,
  FBMParams,
} from '@/Components/LODTerrain/Planet/fbm';

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

//#region --- 1. Memory Map Constants (MUST MATCH MAIN THREAD) ---

// State Buffer Length: 3 (pos) + 4 (rot) + 3 (vel) + 3 (angVel) = 13 Float32s
const PHYSICS_STATE_FLOAT_COUNT = 13;
const STATE_BUFFER_LENGTH = PHYSICS_STATE_FLOAT_COUNT;
const FIXED_STEP = 1 / 60; // 16.66ms for physics updates

// Control Index: 1 Int32 element
export const CONTROL_INDEX_OFFSET = 0; // Index 0 (Int32)

// Buffer A: 13 Float32 elements
export const BUFFER_A_OFFSET = 1; // Index 1 (Float32/Int32)

// Buffer B: 13 Float32 elements
export const BUFFER_B_OFFSET = BUFFER_A_OFFSET + STATE_BUFFER_LENGTH; // Index 14
//#endregion

//#region --- 2. Worker Views ---
export interface WorkerPayload {
	type: 'init' | 'update' | 'input' | 'config' | 'impulse' | 'collision';
	
  sharedBuffer: SharedArrayBuffer;
	delta?: number;

	inputAxis?: { x: number; y: number };
	throttle?: number;
	playerSpeed?: number;
	invertPitch?: number; 
	acceleration?: number;
	pitchVelocity?: number;
	rollVelocity?: number;
	damping?: number; // speed damping
	dampingFactor?: number; // impulse damping
	position?: [number, number, number];

  planetSize?: number; // Base radius
  fbmParams?: FBMParams; // FBM configuration
}

// let sabView: Float32Array; // Physics and control constants (up to index 19)
let sabInt32: Int32Array;
let sabFloat32: Float32Array;

const CONFIG_OFFSET = BUFFER_B_OFFSET + STATE_BUFFER_LENGTH; // = 27
//#endregion

// ---------- GC-FREE OBB SDF SUPPORT (module-scope preallocated data) ----------

// corner signs for unit cube corners, flattened [x,y,z] * 8
const OBB_CORNER_SIGNS = new Float32Array([
  -1, -1, -1,
  -1, -1,  1,
  -1,  1, -1,
  -1,  1,  1,
   1, -1, -1,
   1, -1,  1,
   1,  1, -1,
   1,  1,  1
]);

//#region Preallocated temps - reuse these to avoid allocations in hot path
const _tmpCorner = new Vector3();
const _closestCorner = new Vector3();
const _tmpA = new Vector3();
const _tmpB = new Vector3();
const _gradXPos = new Vector3();
const _gradXNeg = new Vector3();
const _gradYPos = new Vector3();
const _gradYNeg = new Vector3();
const _gradZPos = new Vector3();
const _gradZNeg = new Vector3();

// Result object reused by physics loop (distance + normal)
const _obbResult = {
  distance: 0,
  normal: new Vector3(0, 1, 0)
};
//#endregion

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

// === NEW PLANET STATE ===
let planetRadius = 0; // The base sphere radius (planetSize from PlanetWorker payload)
let fbmParams: FBMParams | null = null;
const playerRadius = 0.5; // The effective collision radius of the player/ship

let isReady = false;
let currentPlayerSpeed = 1;
const messageQueue: MessageEvent<WorkerPayload>[] = [];

// --- Utility (Added isFinite check) ---
function isFinite(x: number) {
	return Number.isFinite(x);
}

function clamp(val: number, minV: number, maxV: number) {
	return Math.max(minV, Math.min(maxV, val));
}

/**
 * Calculates the Signed Distance to the planet surface at a given world position.
 * @param p The player's world position vector.
 * @returns The signed distance. Negative means inside, positive means outside.
 */
function signedDistanceToPlanet(p: Vector3): number {
  if (!fbmParams || planetRadius === 0) return 1000;

  // 1. Get the direction (normalized vector from origin to player)
  const dir = p.clone().normalize();
  const dirArr: [number, number, number] = [dir.x, dir.y, dir.z];

  // 2. Calculate the raw FBM elevation at that point on the sphere (e.g., in the range [-1, 1])
  const rawElevation = fbmParams.useRidged
    ? terrainElevationRidged(dirArr, fbmParams)
    : terrainElevationFBM(dirArr, fbmParams);
    
  // *** CRITICAL FIX: REMAP FBM NOISE ***
  // Assuming FBM returns a value in the range [-1.0, 1.0].
  // We remap this to a positive height factor [0.0, 1.0].
  // Formula: elevation = (rawElevation * 0.5) + 0.5
  const elevation = Math.max(0.0, (rawElevation * 0.5) + 0.5); // Use Math.max(0.0, ...) for safety

  // 3. Calculate the actual radius of the terrain at that point
  const maxH = fbmParams.uMaxHeight ?? 10;
  // This now uses the remapped [0, 1] elevation value:
  const terrainRadius = planetRadius + elevation * maxH; 

  // 4. SDF: Distance from the player to the center of the planet minus the terrain radius.
  return p.length() - terrainRadius;
}

/**
 * Calculates the collision normal (the direction to push the player out).
 * This is simply the planet-relative UP vector, which is the normalized position.
 * @param p The player's world position vector.
 * @returns A normalized Vector3 representing the collision normal.
 */
function calculatePlanetNormal(p: Vector3): Vector3 {
  // For a planet centered at (0,0,0), the surface normal is simply the normalized position vector.
  return p.clone().normalize();
}


/**
 * GC-free: fills `out` with { distance, normal } for the OOBB.
 * - center, halfExtents, orientation are input (Vector3, Vector3, Quaternion)
 * - out is an object: { distance: number, normal: Vector3 } (preallocated)
 *
 * This samples the 8 corners (no allocations) and computes the SDF min and a finite-difference normal.
 */
function obbSignedDistanceWithNormal(
  center: Vector3,
  halfExtents: Vector3,
  orientation: Quaternion,
  out: { distance: number; normal: Vector3 }
): void {
  if (!fbmParams || planetRadius === 0) {
    out.distance = 1000;
    out.normal.x = 0; out.normal.y = 1; out.normal.z = 0;
    return;
  }

  // 1) Find closest corner (min SDF)
  let minDist = Infinity;
  _closestCorner.set(0, 0, 0);

  // iterate over 8 corners (flat array of signs)
  for (let i = 0, si = 0; i < 8; i++, si += 3) {
    // build local corner = signs * halfExtents (no new allocations)
    _tmpCorner.set(
      OBB_CORNER_SIGNS[si + 0] * halfExtents.x,
      OBB_CORNER_SIGNS[si + 1] * halfExtents.y,
      OBB_CORNER_SIGNS[si + 2] * halfExtents.z
    );

    // rotate -> apply quaternion (in-place) and translate to world
    _tmpCorner.applyQuaternion(orientation);
    _tmpCorner.add(center);

    // sample SDF for this corner
    const d = signedDistanceToPlanet(_tmpCorner);
    if (d < minDist) {
      minDist = d;
      _closestCorner.copy(_tmpCorner); // store world-space closest corner
    }

    // restore _tmpCorner for next iteration (we set it every loop)
  }

  out.distance = minDist;

  // 2) If we only need the distance and it's large (no collision), short-circuit with default normal
  // (we'll still produce a sane normal)
  const eps = 0.5; // finite-difference offset in world units (tweak as needed)

  // compute SDF at closestCorner +/- eps along each world axis using preallocated temps
  // X
  _gradXPos.copy(_closestCorner).add(_tmpA.set(eps, 0, 0));
  const sdfXPos = signedDistanceToPlanet(_gradXPos);
  _gradXNeg.copy(_closestCorner).add(_tmpB.set(-eps, 0, 0));
  const sdfXNeg = signedDistanceToPlanet(_gradXNeg);

  // Y
  _gradYPos.copy(_closestCorner).add(_tmpA.set(0, eps, 0));
  const sdfYPos = signedDistanceToPlanet(_gradYPos);
  _gradYNeg.copy(_closestCorner).add(_tmpB.set(0, -eps, 0));
  const sdfYNeg = signedDistanceToPlanet(_gradYNeg);

  // Z
  _gradZPos.copy(_closestCorner).add(_tmpA.set(0, 0, eps));
  const sdfZPos = signedDistanceToPlanet(_gradZPos);
  _gradZNeg.copy(_closestCorner).add(_tmpB.set(0, 0, -eps));
  const sdfZNeg = signedDistanceToPlanet(_gradZNeg);

  // central differences -> build gradient (un-normalized)
  const nx = sdfXPos - sdfXNeg;
  const ny = sdfYPos - sdfYNeg;
  const nz = sdfZPos - sdfZNeg;

  // write into out.normal and normalize in-place
  out.normal.x = nx;
  out.normal.y = ny;
  out.normal.z = nz;
  out.normal.normalize();

  // fallback: if normal is invalid (zero-length), use planet normal at closestCorner
  if (!Number.isFinite(out.normal.x) || out.normal.length() === 0) {
    out.normal.copy(calculatePlanetNormal(_closestCorner));
  }
}

// === Initialization ===
const init = (data: WorkerPayload) => {
	if (!data.sharedBuffer) return;

  console.log('init', { data})

	// Create the views using the entire buffer passed from the main thread
	sabFloat32 = new Float32Array(data.sharedBuffer);
	sabInt32 = new Int32Array(data.sharedBuffer);
	// 	sabView = sabFloat32; // Used for legacy reference
  // Store new planet configuration
  if (data.planetSize !== undefined) planetRadius = data.planetSize;
  if (data.fbmParams) fbmParams = data.fbmParams;
	// Read the initial state (written by main thread into Buffer A)
	readPhysicsState(BUFFER_A_OFFSET);

	// Read the initial player speed config
	if (data.playerSpeed !== undefined) currentPlayerSpeed = data.playerSpeed;

	markReady();

	// 🚀 CRITICAL: Start the fixed-rate physics loop
	// This runs the physics independent of the main thread's visual FPS
	setInterval(updatePhysics, FIXED_STEP * 1000);
	console.log("Physics worker initialized and fixed-step loop started.");
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
	// Only read config/speed changes here. Inputs are read directly in `updatePhysics`.
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

// --- Core Update Logic (Renamed and fixed delta) ---

/**
 * Executes one fixed-time physics step (1/60th of a second).
 * This function is called autonomously via setInterval, not by the main thread.
 */
function updatePhysics() {
	if (!sabInt32) return;
	// console.log('WORKER: throttle=', sabFloat32[CONFIG_OFFSET + 4], 'accel=', sabFloat32[CONFIG_OFFSET + 0]);
	// console.log('WORKER: velocity=', velocity.x, velocity.y, velocity.z);


	// --- 1. State/Buffer Management ---
	const activeBufferIndex = Atomics.load(sabInt32, CONTROL_INDEX_OFFSET);
	const inactiveBufferIndex = 1 - activeBufferIndex;
	const inactiveOffset = inactiveBufferIndex === 0 ? BUFFER_A_OFFSET : BUFFER_B_OFFSET;

	// --- 2. Read Inputs/Constants from CONFIG_OFFSET ---
	const accel = sabFloat32[CONFIG_OFFSET + 0] || 0;
	const pitchVel = sabFloat32[CONFIG_OFFSET + 1] || 0;
	const rollVel = sabFloat32[CONFIG_OFFSET + 2] || 0;
	const damping = sabFloat32[CONFIG_OFFSET + 3] ?? 0.98;
	const throttle = sabFloat32[CONFIG_OFFSET + 4] ?? 0;
	const inputX = sabFloat32[CONFIG_OFFSET + 5] ?? 0;
	const inputY = sabFloat32[CONFIG_OFFSET + 6] ?? 0;

	// --- 3. Fixed Delta / numerical safety ---
	// The integration step is now fixed and constant: FIXED_STEP seconds
	const clampedRawDelta = FIXED_STEP; // The actual time delta in seconds (1/60)
	const dt = 1.0; // Normalized step for decay/smoothing: 1.0 == 60 steps per second
	// also provide a small safe scalar for interpolation smoothing
	const SMOOTHING_RATE = 8.0; // bigger -> faster converge to desired velocity

	// --- 4. Rotation (angular velocities from input) ---
	angularVelocity.x = inputY * pitchVel;
	angularVelocity.z = inputX * rollVel;

	// damping on angular velocity
	angularVelocity.multiplyScalar(Math.pow(damping, dt));

	// --- 5. Update Speed (Thrust) ---
	let speed = velocity.length();
	const maxSpeed = Math.max(0.0001, currentPlayerSpeed || 1);
	const maxBrakeSpeed = -maxSpeed * 0.5;

	if (throttle > 0) {
		speed = Math.min(speed + accel * throttle * dt, maxSpeed);
	} else if (throttle < 0) {
		speed = Math.max(speed + accel * throttle * dt, maxBrakeSpeed);
	} else {
		// drag, use a stable decay independent of speed magnitude
		speed *= Math.pow(0.98, dt);
	}

	// clamp to prevent runaway
	const ABS_SPEED_LIMIT = maxSpeed * 4; // safety margin
	speed = clamp(speed, -ABS_SPEED_LIMIT, ABS_SPEED_LIMIT);

	// --- 6. Apply Rotation to Position (Calculates local axes) ---
	tmpRight.set(1, 0, 0).applyQuaternion(rot).normalize();
	tmpForward.set(0, 0, 1).applyQuaternion(rot).normalize();

	tmpPitchQuat.setFromAxisAngle(tmpRight, angularVelocity.x * clampedRawDelta);
	tmpRollQuat.setFromAxisAngle(tmpForward, angularVelocity.z * clampedRawDelta);
	rot.premultiply(tmpRollQuat).premultiply(tmpPitchQuat).normalize();

	// --- 7. Update Velocity Vector (safe lerp) ---
	tmpForward.set(0, 0, -1).applyQuaternion(rot);
	tmpDesiredVel.copy(tmpForward).multiplyScalar(speed);

	// compute a bounded lerp alpha in [0,1]
	// using exponential smoothing: alpha = 1 - exp(-k * dt)
	const lerpAlpha = Math.min(1, 1 - Math.exp(-SMOOTHING_RATE * Math.min(dt, 2)));
	// ensure alpha is never > 1
	const safeAlpha = clamp(lerpAlpha, 0, 1);

	// perform lerp with safeAlpha
	velocity.lerp(tmpDesiredVel, safeAlpha);

	// additional clamp on velocity magnitude (sanity)
	const velLen = velocity.length();
	if (!isFinite(velLen) || velLen > ABS_SPEED_LIMIT * 10) {
		// If velocity is non-finite or absurd, reset
		velocity.set(0, 0, 0);
	} else if (velLen > ABS_SPEED_LIMIT) {
		// scale back to limit
		velocity.multiplyScalar(ABS_SPEED_LIMIT / velLen);
	}

	// --- 8. Integrate Position (use clampedRawDelta, which is FIXED_STEP)
	tmpDesiredVel.copy(velocity).multiplyScalar(clampedRawDelta);
	pos.add(tmpDesiredVel);

    // --- 9. SDF COLLISION CHECK (GC-FREE OOBB result + resolution) ---
  // Example OOBB half extents - keep this preallocated or read from config if variable
  const halfExtents = _tmpA.set(1.0, 0.5, 2.0); // reusing _tmpA temporarily to hold halfExtents values

  // fill _obbResult (preallocated)
  obbSignedDistanceWithNormal(pos, halfExtents, rot, _obbResult);

  const distance = _obbResult.distance;
  const contactNormal = _obbResult.normal; // preallocated Vector3

  if (distance < playerRadius) {
    // penetration depth (positive)
    const penetrationDepth = playerRadius - distance;

    // 1) Push out the position along contactNormal (in-place arithmetic)
    pos.x += contactNormal.x * penetrationDepth;
    pos.y += contactNormal.y * penetrationDepth;
    pos.z += contactNormal.z * penetrationDepth;

    // 2) Decompose velocity into normal (vn) and tangential (vt) parts using tmp vectors
    // vn = (v ⋅ n) * n
    const vDotN = velocity.x * contactNormal.x + velocity.y * contactNormal.y + velocity.z * contactNormal.z;
    _tmpB.set(contactNormal.x * vDotN, contactNormal.y * vDotN, contactNormal.z * vDotN); // vn

    // vt = v - vn
    _tmpCorner.set(velocity.x - _tmpB.x, velocity.y - _tmpB.y, velocity.z - _tmpB.z); // vt

    // 3) Apply restitution (bounce) on normal component and slideFactor on tangent
    const restitution = 0.0; // adjust or read from config
    const slideFactor = 10.0; // adjust or read from config

    // reflect/negate normal component based on restitution
    _tmpB.multiplyScalar(-restitution);

    // scale tangent
    _tmpCorner.multiplyScalar(slideFactor);

    // combine -> velocity = vt + vn
    velocity.x = _tmpCorner.x + _tmpB.x;
    velocity.y = _tmpCorner.y + _tmpB.y;
    velocity.z = _tmpCorner.z + _tmpB.z;

    // 4) damp angular velocity for stability
    angularVelocity.multiplyScalar(0.1);
  }


	// --- 10. Numerical stability watchdog ---
	const rotIsFinite = isFinite(rot.x) && isFinite(rot.y) && isFinite(rot.z) && isFinite(rot.w);
	if (
		!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z) ||
		!rotIsFinite || !isFinite(velocity.x) || !isFinite(velocity.y) || !isFinite(velocity.z) ||
		Math.abs(rot.x) > 1e6 || Math.abs(pos.x) > 1e6 || Math.abs(velocity.x) > 1e6
	) {
		// log for debug
		console.error('NUMERICAL INSTABILITY DETECTED: resetting state', {
			pos: { x: pos.x, y: pos.y, z: pos.z },
			rot: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
			vel: { x: velocity.x, y: velocity.y, z: velocity.z },
			dt: clampedRawDelta
		});

		// safe reset
		pos.set(0, 0, 0);
		rot.set(0, 0, 0, 1);
		velocity.set(0, 0, 0);
		angularVelocity.set(0, 0, 0);

		// Write safe reset to inactive buffer and flip
		writePhysicsState(inactiveOffset);
		Atomics.store(sabInt32, CONTROL_INDEX_OFFSET, inactiveBufferIndex);
		return;
	}

	// --- 10. Write back to INACTIVE buffer and flip atomically ---
	writePhysicsState(inactiveOffset);
	Atomics.store(sabInt32, CONTROL_INDEX_OFFSET, inactiveBufferIndex);
}

// NOTE: The original `update` function is now redundant as physics runs autonomously.
// It is preserved here as a no-op placeholder.
function update({  }: WorkerPayload) {
	console.warn("Received redundant 'update' message. Physics is running autonomously via setInterval.");
}

// === Dispatcher ===
const handleMessage = (e: MessageEvent<WorkerPayload>) => {
	const { type } = e.data;

	if (type === 'init') {
		init(e.data);
	} else if (type === 'update') {
		// Explicitly removed the call to update(e.data) as physics is autonomous.
		// The function itself now warns and does nothing.
		update(e.data); 
	} else if (type === 'input' || type === 'config') {
		handleInput(e.data);
	} else if (type === 'impulse') {
		handleImpulse(e.data);
	} else if (type == 'collision') {
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
