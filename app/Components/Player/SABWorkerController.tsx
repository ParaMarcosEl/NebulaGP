'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { MeshBVH } from 'three-mesh-bvh';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController';
// import { getNearestCurveT, isMobileDevice } from '@/Utils';
import { Mine, useMines } from '../Weapons/useMines';
import { useProjectileCollisions } from '@/Controllers/Collision/useProjectileCollisions';
import { onBulletCollision } from '@/Utils/collisions';
import { TUBE_RADIUS } from '@/Constants';
import { useSettingsStore } from '@/Controllers/Settings/useSettingsStore';
import { useProjectiles } from '../Weapons/useProjectiles';
import { usePlaySound } from '@/Controllers/Audio/usePlaySounds';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';
import { checkOutOfBoundsSDF } from '@/Utils/SDF';
import { ExplosionHandle } from '../Particles/ExplosionParticles/ExplosionParticles';
import { WorkerPayload } from '@/Constants'; // Import the payload interface

// Import Atomics for read verification
const { Atomics } = globalThis;

function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}

// --- Global Input Refs (Unchanged) ---
const inputAxisRef = { current: { x: 0, y: 0 } };
const throttleRef = { current: 0 };
const firingRef = { current: false };

export const playerInputAxis = {
    set: (axis: { x: number; y: number }) => {
        inputAxisRef.current = axis;
    },
};

export const setThrottle = (value: number) => {
    throttleRef.current = value;
};

export const setFiringRef = (value: boolean) => {
    firingRef.current = value;
};

type PlayerSystemOptions = {
    id: number;
    trackId: number;
    minePoolRef: React.RefObject<Mine[]>;
    explosionsRef?: React.RefObject<ExplosionHandle>;
    aircraftRef: React.RefObject<THREE.Group | null>;
    playerRefs: React.RefObject<THREE.Group | null>[];
    obstacleRefs?: React.RefObject<THREE.Mesh | null>[];
    playingFieldRef?: React.RefObject<THREE.Mesh | null>;
    pitchVelocity?: number;
    rollVelocity?: number;
    acceleration?: number;
    damping?: number;
    noiseAmplitude?: number;
    noiseFrequency?: number;
    botSpeed: number; // Max speed setting (renamed to avoid conflict)
    enabled: boolean;
    curve: THREE.Curve<THREE.Vector3>;
    onSpeedChange?: (speed: number) => void;
    onAcceleratingChange?: (state: boolean) => void;
    onBrakingChange?: (state: boolean) => void;
};

// ----------------------------------------------------------------------
// 🆕 UPDATED SAB STRUCTURE AND CONSTANTS FOR DOUBLE BUFFERING
// Note: All indices now refer to the Int32Array (4-byte elements)
// ----------------------------------------------------------------------

// The number of float elements in the physics state (pos: 3, rot: 4, vel: 3, angVel: 3 = 13)
const PHYSICS_STATE_FLOAT_COUNT = 13;
// Total elements for a single state snapshot (13 floats = 13 Int32s)
const STATE_BUFFER_INT32_LENGTH = PHYSICS_STATE_FLOAT_COUNT;

// 0. The single Int32 at the start that points to the active buffer (0 or 1).
const CONTROL_INDEX_OFFSET = 0;
const CONTROL_BUFFER_LENGTH = 1; // 1 Int32 element

// 1. Buffer A: Starts immediately after the control index
const BUFFER_A_OFFSET = CONTROL_INDEX_OFFSET + CONTROL_BUFFER_LENGTH; // Index 1
// 2. Buffer B: Starts immediately after Buffer A
const BUFFER_B_OFFSET = BUFFER_A_OFFSET + STATE_BUFFER_INT32_LENGTH; // Index 1 + 13 = 14

// 3. Configuration/Input Buffer: Starts after Buffer B
const CONFIG_OFFSET = BUFFER_B_OFFSET + STATE_BUFFER_INT32_LENGTH; // Index 14 + 13 = 27
// Note: We use the existing indices 17-19 (and a new 20) for throttle/axis, 
// so the layout must be adapted in the worker to match this.

// Total elements: 1 (Control) + 13 (A) + 13 (B) + 7 (Input/Config) = 34 elements
const SAB_TOTAL_INT32_LENGTH = 34;

// SAB creation: We use 4 bytes per element (Int32 or Float32), so 31 * 4 bytes total
const sabBuffer = new SharedArrayBuffer(SAB_TOTAL_INT32_LENGTH * 4);

// Views (Note: We primarily use the Int32Array view for all access, even floats)
const sabInt32 = new Int32Array(sabBuffer);
// We keep the sabFloat32 view for clarity if needed, but it's not strictly necessary for the atomic logic
const sabFloat32 = new Float32Array(sabBuffer);

export function usePlayerWorkerController({
    id: playerId,
    minePoolRef,
    explosionsRef,
    aircraftRef,
    playerRefs,
    playingFieldRef,
    acceleration = 10,
    pitchVelocity = 0.03,
    rollVelocity = 0.06,
    damping = 0.5,
    curve,
    enabled,
}: PlayerSystemOptions) {

    // --- Worker Refs: Refactored ---
    const workerRef = useRef<Worker | null>(null);
    //   const sabRef = useRef<SharedArrayBuffer | null>(null);
    // 🆕 Store the master Int32Array view here. The Int32 view is used for all reads/writes.
    const sabViewRef = useRef<Int32Array | null>(null);
    // Removed: sabSeqViewRef is no longer needed, as the control index is part of the main view

    const keys = useRef<Record<string, boolean>>({});


    // Separate ref for the sequence counter Int32Array view
    //   const sabSeqViewRef = useRef<Int32Array | null>(null); 

    const gamepadIndex = useRef<number | null>(null);

    const {
        raceStatus,
        playerSpeed: maxPlayerSpeed,
        raceData,
        setOutOfBounds,
        addOutOfBoundsTime,
        setUseMine,
        setShieldValue,
    } = useGameStore((s) => s);
    const { invertPitch } = useSettingsStore((s) => s);
    const playSound = usePlaySound();
    const { buffers, audioEnabled } = useAudioStore((s) => s);
    const { planetMeshes } = usePlanetStore((s) => s);

    const controlsEnabled = raceStatus === 'racing'; // --- Weapons and Collisions Hooks (Unchanged) ---

    const { fire, poolRef } = useProjectiles(
        aircraftRef as React.RefObject<THREE.Object3D>,
        explosionsRef as React.RefObject<ExplosionHandle>,
        {
            fireRate: 5,
            maxProjectiles: 20,
            velocity: 400,
        },
    );

    const { drop } = useMines(
        aircraftRef as React.RefObject<THREE.Object3D>,
        minePoolRef,
        explosionsRef as React.RefObject<ExplosionHandle>,
        {
            maxMines: 16,
            dropOffset: 6,
        },
    );

    useProjectileCollisions({
        projectiles: poolRef.current,
        playerRefs,
        explosionsRef: explosionsRef as React.RefObject<ExplosionHandle>,
        onCollide: onBulletCollision,
    });

    // -----------------------------
    // WORKER INITIALIZATION AND CLEANUP (Double Buffer Setup)
    // -----------------------------
    useEffect(() => {
        if (!enabled) return;

        const worker = new Worker(new URL('@/workers/PlayerSABWorker.worker.ts', import.meta.url), {
            type: 'module',
        });
        workerRef.current = worker;

        // Use the pre-allocated sabBuffer and views
        const view = sabInt32;
        const floatView = sabFloat32;

        // Store master view in ref
        sabViewRef.current = view;

        const ship = aircraftRef.current;
        const initialPos = ship?.position ?? new THREE.Vector3(0, 0, 0);
        const initialQuat = ship?.quaternion ?? new THREE.Quaternion(0, 0, 0, 1);

        // --- Initialize Buffers A and B with initial state ---

        // Helper function to set a buffer's initial state
        const setBufferState = (offset: number) => {
            floatView[offset + 0] = initialPos.x;
            floatView[offset + 1] = initialPos.y;
            floatView[offset + 2] = initialPos.z; // pos (3)
            floatView[offset + 3] = initialQuat.x;
            floatView[offset + 4] = initialQuat.y;
            floatView[offset + 5] = initialQuat.z;
            floatView[offset + 6] = initialQuat.w; // quat (4)
            // velocity and angular velocity (6) are left at 0 by default
        };

        // Initialize both buffers with the same initial state
        setBufferState(BUFFER_A_OFFSET);
        setBufferState(BUFFER_B_OFFSET);

        // --- Initialize Control/Input Section ---
        Atomics.store(view, CONTROL_INDEX_OFFSET, 0); // Start with Buffer A as active (index 0)

        // Write config/inputs to the CONFIG_OFFSET
        floatView[CONFIG_OFFSET + 0] = acceleration;
        floatView[CONFIG_OFFSET + 1] = pitchVelocity;
        floatView[CONFIG_OFFSET + 2] = rollVelocity;
        floatView[CONFIG_OFFSET + 3] = damping;
        // throttle/axis are written in useFrame

        const initialPayload: WorkerPayload = {
            type: 'init',
            // Pass the single shared buffer
            sharedBuffer: sabBuffer,
            playerSpeed: maxPlayerSpeed,
            invertPitch: invertPitch ? -1 : 1,
        };
        // Transfer ownership of the SAB to the worker
        worker.postMessage(initialPayload);

        // Keep worker and sab in scope
        return () => {
            worker.terminate();
            workerRef.current = null;
            // sabRef.current = null; // sabBuffer is now global, no need to clear ref
            sabViewRef.current = null;
        };
    }, [
        enabled,
        maxPlayerSpeed,
        invertPitch,
        aircraftRef,
        acceleration,
        pitchVelocity,
        rollVelocity,
        damping,
    ]);

    useEffect(() => {
        workerRef.current?.postMessage({
            type: 'config',
            playerSpeed: maxPlayerSpeed,
            invertPitch: invertPitch ? -1 : 1,
        });
    }, [maxPlayerSpeed, invertPitch]);

    // initialize prev/curr from SAB once available
    // NOTE: This initialization is slightly risky as it reads the initial data *before* the worker is fully initialized.
    // A more robust approach is to wait for a 'ready' signal from the worker. But, for a quick fix:
    useEffect(() => {
        const floatView = sabFloat32;
        // Read from Buffer A (the initial active buffer, index 0)
        if (floatView) {
            currSabPos.current.set(floatView[BUFFER_A_OFFSET + 0], floatView[BUFFER_A_OFFSET + 1], floatView[BUFFER_A_OFFSET + 2]);
            prevSabPos.current.copy(currSabPos.current);
            currSabQuat.current.set(floatView[BUFFER_A_OFFSET + 3], floatView[BUFFER_A_OFFSET + 4], floatView[BUFFER_A_OFFSET + 5], floatView[BUFFER_A_OFFSET + 6]);
            prevSabQuat.current.copy(currSabQuat.current);
        }
    }, []);

    // --- Keyboard & Gamepad Listeners (Unchanged) ---
    useEffect(() => {
        if (!enabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = false;
        };
        const handleGamepadConnected = (e: GamepadEvent) => {
            if (gamepadIndex.current === null) gamepadIndex.current = e.gamepad.index;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('gamepadconnected', handleGamepadConnected);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('gamepadconnected', handleGamepadConnected);
        };
    }, [enabled]);

    // -----------------------------
    // PREBUILD BVH FOR PLANETS (Unchanged)
    // -----------------------------
    useEffect(() => {
        for (const planetMesh of planetMeshes) {
            if (!planetMesh) continue;
            const geometry = planetMesh.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
            if (geometry && !geometry.boundsTree) {
                try {
                    geometry.boundsTree = new MeshBVH(geometry);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to build BVH for planet mesh', err);
                }
            }
        }
    }, [planetMeshes]);

    // --- Temporary Objects (GC-free, preallocated) ---
    const tmp = useRef({
        // math
        localShipPos: new THREE.Vector3(),
        meshMatrixInverse: new THREE.Matrix4(),
        pushDir: new THREE.Vector3(),
        worldHitPoint: new THREE.Vector3(), // hit info
        hitInfo: { point: new THREE.Vector3(), distance: 0, faceIndex: -1 } as {
            point: THREE.Vector3;
            distance: number;
            faceIndex: number;
        }, // 🚀 GC-FREE Quat Extrapolation Helpers
        invPrevQuat: new THREE.Quaternion(),
        deltaQuat: new THREE.Quaternion(),
        currTimesDeltaQuat: new THREE.Quaternion(),
        // 🆕 sabSnapshot is now large enough for 13 floats (52 bytes)
        sabSnapshot: new Float32Array(STATE_BUFFER_INT32_LENGTH),
        // 🆕 Temporary vectors/quats for the new readPhysicsState logic
        tmpPos1: new THREE.Vector3(),
        tmpQuat1: new THREE.Quaternion(),
        tmpPos2: new THREE.Vector3(),
        tmpQuat2: new THREE.Quaternion(),
    }).current;

    // Keep the refs you had (preserve structure)
    const prevSabPos = useRef(new THREE.Vector3());
    const prevSabQuat = useRef(new THREE.Quaternion());
    const currSabPos = useRef(new THREE.Vector3());
    const currSabQuat = useRef(new THREE.Quaternion());
    const predictedPos = useRef(new THREE.Vector3());
    const predictedQuat = useRef(new THREE.Quaternion());
    //   const dv = useRef(new THREE.Vector3()); // delta vector reuse
    //   const tmpQuat = useRef(new THREE.Quaternion()); // --- Throttle Counters (Unchanged) ---

    const frameCounterRef = useRef(0);
    const gamepadPollCounterRef = useRef(0);
    //   const lastNearestTRef = useRef({ t: 0, pos: new THREE.Vector3() });
    const lastCollisionAudioTimeRef = useRef(0);
    const lastShieldUpdateTimeRef = useRef(0);
    //   const onSpeedLastRef = useRef(0);
    //   const nearestTThrottleFrames = 3;
    const gamepadPollFrames = 5;
    const collisionAudioCooldownMs = 120;
    const shieldUpdateMs = 100;

    // Interpolation accumulator for physics -> render
    const accumulatorRef = useRef(0);
    const fixedStep = 1 / 60; // physics step size

    const interpolationAlpha = 0.9; // visual lerp toward predicted state (kept)
    //   const predictionScale = 1.0; // predict one frame ahead
    // Smoothed camera target kept here
    const smoothedCameraTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
    //   const smoothedCameraTarget = smoothedCameraTargetRef.current;

    // initialize prev/curr from SAB once available
    useEffect(() => {
        const view = sabViewRef.current;
        if (!view) return;
        currSabPos.current.set(view[0], view[1], view[2]);
        prevSabPos.current.copy(currSabPos.current);
        currSabQuat.current.set(view[3], view[4], view[5], view[6]);
        prevSabQuat.current.copy(currSabQuat.current);
    }, []);

    // ---------- MAIN LOOP (useFrame) ----------
    useFrame((_, delta) => {
        const worker = workerRef.current;
        const ship = aircraftRef.current;
        const int32View = sabInt32; // Use the Int32 view for atomics (control index)
        const floatView = sabFloat32; // Use the Float32 view for reading the float data
        const sabSnapshot = tmp.sabSnapshot;
        // 🆕 The master view is now Int32Array (but we read floats)
        //     const view = sabViewRef.current; 

        // The sabSeqViewRef is no longer used, we only need the worker, ship, and views
        if (!enabled || !controlsEnabled || !ship || !int32View || !worker) return;

        frameCounterRef.current += 1;
        gamepadPollCounterRef.current = (gamepadPollCounterRef.current + 1) % gamepadPollFrames;

        // === Input gathering (unchanged) ===
        const throttle = throttleRef.current;
        const shouldFire = firingRef.current;

        let gp: Gamepad | undefined;
        if (gamepadPollCounterRef.current === 0 && typeof navigator.getGamepads === 'function') {
            const gps = navigator.getGamepads();
            gp =
                gamepadIndex.current !== null
                    ? (gps?.[gamepadIndex.current] ?? undefined)
                    : gps?.[0] || undefined;
        } else {
            gp = undefined;
        }

        const { x: touchX, y: touchY } = inputAxisRef.current;
        let finalRollAxis = 0;
        let finalPitchAxis = 0;
        if (Math.abs(touchX) > 0.01 || Math.abs(touchY) > 0.01) {
            finalRollAxis += touchX;
            finalPitchAxis += touchY;
        } else {
            if (gp && gp.connected) {
                finalRollAxis += gp.axes?.[0] ?? 0;
                finalPitchAxis += gp.axes?.[1] ?? 0;
            }
            if (keys.current['a']) finalRollAxis += 1;
            if (keys.current['d']) finalRollAxis -= 1;
            if (keys.current['w']) finalPitchAxis -= 1;
            if (keys.current['s']) finalPitchAxis += 1;
        }
        finalRollAxis = clamp(finalRollAxis, -1, 1);
        finalPitchAxis = clamp(finalPitchAxis, -1, 1);

        const gamepadButtons = gp?.buttons;
        const keysAccelerating = keys.current['i'] || gamepadButtons?.[0]?.pressed;
        const keysBraking = keys.current['k'] || gamepadButtons?.[2]?.pressed;
        let finalThrottle = throttle;
        if (keysAccelerating) finalThrottle = Math.max(finalThrottle, 1);
        if (keysBraking) finalThrottle = Math.min(finalThrottle, -1);

        // Write inputs into CONFIG_OFFSET (using floatView for convenience)
        // NOTE: These indices must match the worker's expected input location
        floatView[CONFIG_OFFSET + 4] = finalThrottle; // Throttle is the 5th element in config (index 4)
        floatView[CONFIG_OFFSET + 5] = finalRollAxis; // Roll Axis (index 5)
        floatView[CONFIG_OFFSET + 6] = finalPitchAxis; // Pitch Axis (index 6)
        console.log({ finalThrottle })
        // Tell worker to run one physics update (it will write into SAB)
        worker.postMessage({ type: 'update', delta });

        // --------------------------
        // Interpolate between physics steps (accumulator approach)
        // --------------------------
        // We sample SAB at fixedStep boundaries: whenever fixedStep elapses we shift prev<-curr and read new curr.
        accumulatorRef.current += delta;

        // While loop handles cases where delta > fixedStep (low frame rate)
        while (accumulatorRef.current >= fixedStep) {
            // shift prev <- curr
            prevSabPos.current.copy(currSabPos.current);
            prevSabQuat.current.copy(currSabQuat.current);

            // 🚀 CRITICAL: NON-BLOCKING DOUBLE-BUFFER READ

            // 1. Atomically read the index of the ACTIVE buffer (0 or 1)
            // This single operation is the entire synchronization mechanism.
            const activeBufferIndex = Atomics.load(int32View, CONTROL_INDEX_OFFSET);

            // 2. Determine the starting offset of the ACTIVE buffer
            const activeOffset = activeBufferIndex === 0 ? BUFFER_A_OFFSET : BUFFER_B_OFFSET;

            // 3. Read the complete and consistent physics data (13 floats from the ACTIVE buffer)
            // The worker guaranteed that the data at this index is complete before flipping CONTROL_INDEX_OFFSET.
            for (let i = 0; i < STATE_BUFFER_INT32_LENGTH; i++) {
                // Read from the Float32 view at the determined offset
                sabSnapshot[i] = floatView[activeOffset + i];
            }

            // State is now consistent (sabSnapshot has the good data)
            currSabPos.current.set(sabSnapshot[0], sabSnapshot[1], sabSnapshot[2]);
            currSabQuat.current.set(sabSnapshot[3], sabSnapshot[4], sabSnapshot[5], sabSnapshot[6]);

            accumulatorRef.current -= fixedStep;
        }

        // alpha for interpolation between prev and curr
        const alpha = Math.min(accumulatorRef.current / fixedStep, 1);

        // positional interpolation
        predictedPos.current.lerpVectors(prevSabPos.current, currSabPos.current, alpha);

        // rotational extrapolation (safe slerp using tmp quats in tmp)
        // compute delta quaternion = curr * prev^-1 then apply fraction alpha
        tmp.invPrevQuat.copy(prevSabQuat.current).invert();
        tmp.deltaQuat.copy(currSabQuat.current).premultiply(tmp.invPrevQuat); // delta = curr * prev^-1
        tmp.currTimesDeltaQuat.copy(currSabQuat.current).multiply(tmp.deltaQuat); // curr * delta
        // slerp from curr toward curr*delta by alpha to get predictedQuat (works as extrapolation)
        predictedQuat.current.copy(currSabQuat.current).slerp(tmp.currTimesDeltaQuat, alpha);

        // LERP visuals toward predicted state (this gives smoothing/visual blending)
        ship.position.lerp(predictedPos.current, interpolationAlpha);
        ship.quaternion.slerp(predictedQuat.current, interpolationAlpha);

        if (
            !isFinite(ship.position.x) ||
            !isFinite(ship.position.y) ||
            !isFinite(ship.position.z) ||
            !isFinite(ship.quaternion.x)
        ) {
            console.error("SHIP STATE CORRUPTED: Non-finite value detected!");
            // Set a breakpoint here to inspect `predictedPos.current` and the SAB data.
            debugger;
        }

        // --- COLLISIONS / OUT OF BOUNDS (Uses ship.position/quaternion LERPed) ---
        if (planetMeshes.length > 0) {
            for (let i = 0; i < planetMeshes.length; i++) {
                const planetMesh = planetMeshes[i];
                if (!planetMesh) continue;
                const geometry = planetMesh.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
                if (!geometry?.boundsTree) continue;

                tmp.meshMatrixInverse.copy(planetMesh.matrixWorld).invert();
                tmp.localShipPos.copy(ship.position).applyMatrix4(tmp.meshMatrixInverse);

                const hit = tmp.hitInfo;
                hit.distance = 0;
                hit.faceIndex = -1;

                if (geometry.boundsTree.closestPointToPoint(tmp.localShipPos, hit)) {
                    tmp.worldHitPoint.copy(hit.point).applyMatrix4(planetMesh.matrixWorld);
                    const dist = ship.position.distanceTo(tmp.worldHitPoint);
                    const minDistance = 6;
                    if (dist < minDistance) {
                        // 🆕 CRITICAL CHANGE: NO DIRECT MAIN-THREAD WRITE TO SAB POS
                        tmp.pushDir.subVectors(ship.position, tmp.worldHitPoint).normalize();
                        if (tmp.pushDir.lengthSq() === 0) tmp.pushDir.copy(ship.position).normalize();


                        // ⚠️ CRITICAL: write back corrected position to the single SAB view
                        // 1. Calculate the *target* corrected position
                        const correctedPos = tmp.worldHitPoint.addScaledVector(tmp.pushDir, minDistance);
                        // 2. Send correction to worker (Worker is the single source of truth for physics)
                        worker.postMessage({
                            type: 'collision',
                            position: [correctedPos.x, correctedPos.y, correctedPos.z],
                            dampingFactor: 0.5
                        });

                        ship.position.copy(correctedPos);

                        // notify worker to apply impulse/damping logic on next frame
                        worker.postMessage({ type: 'impulse', dampingFactor: 0.5 });

                        // play sound + shield            
                        const now = performance.now();
                        if (
                            audioEnabled &&
                            now - lastCollisionAudioTimeRef.current > collisionAudioCooldownMs
                        ) {
                            playSound?.(buffers['clank04'], ship.position, 1, 3);
                            lastCollisionAudioTimeRef.current = now;
                        }
                        if (
                            raceData[playerId]?.shieldValue > 0 &&
                            performance.now() - lastShieldUpdateTimeRef.current > shieldUpdateMs
                        ) {
                            setShieldValue(raceData[playerId].shieldValue - 0.5, playerId);
                            lastShieldUpdateTimeRef.current = performance.now();
                        }
                    }
                }
            }
        }

        // --- OUT OF BOUNDS SDF (Unchanged) ---
        if (playingFieldRef?.current) {
            checkOutOfBoundsSDF(
                ship,
                curve,
                TUBE_RADIUS,
                [{ t: 0.4, radius: 100 }],
                playerId,
                delta,
                raceData,
                setOutOfBounds,
                addOutOfBoundsTime,
            );
        }

        // --- WEAPON FIRE (Unchanged) ---
        const shooting = !!keys.current['j'];
        const value = raceData[playerId]?.cannonValue || 0;
        if ((shooting || shouldFire) && value > 0) fire(playerId);
        if ((shooting || shouldFire) && raceData[playerId]?.useMine) {
            drop();
            setUseMine(playerId, false);
        }

        // --- Camera Target Smoothing (Single smoothing layer, controller only) ---
        const cameraTarget = smoothedCameraTargetRef.current;

        // Exponential smoothing logic
        const cameraPositionLag = 0.15; // Slightly slower follow
        const cameraRotationLag = 0.1;

        const positionAlpha = 1 - Math.exp(-delta / cameraPositionLag);
        const rotationAlpha = 1 - Math.exp(-delta / cameraRotationLag);

        // 1. Position: Lerp the target toward the ship's current visual position
        cameraTarget.position.lerp(ship.position, positionAlpha);

        // 2. Rotation: Slerp the target toward the ship's current visual rotation
        cameraTarget.quaternion.slerp(ship.quaternion, rotationAlpha);

        // Update the camera target ref for the camera component to use
        ship.userData.smoothedCameraTarget = cameraTarget;

        // optional hook for recording simulation state (left as-is)
        if (ship.userData.recordSimulationState) ship.userData.recordSimulationState();
    });
}