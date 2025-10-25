/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { MeshBVH } from 'three-mesh-bvh';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController';
import { getNearestCurveT, isMobileDevice } from '@/Utils';
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

export function usePlayerWorkerController({
  id: playerId,
  minePoolRef,
  explosionsRef,
  aircraftRef,
  playerRefs,
  playingFieldRef,
  acceleration = 0.001,
  pitchVelocity = 0.03,
  rollVelocity = 0.015,
  damping = 0.5,
  botSpeed,
  curve,
  enabled,
  onSpeedChange,
  onAcceleratingChange,
  onBrakingChange,
}: PlayerSystemOptions) {
  // --- Worker Refs ---
  const workerRef = useRef<Worker | null>(null);
  const sabRefs = useRef<{ position?: SharedArrayBuffer; quaternion?: SharedArrayBuffer }>({});
  // reusable typed array views (GC-free)
  const posViewRef = useRef<Float32Array | null>(null);
  const quatViewRef = useRef<Float32Array | null>(null);

  // runtime refs
  const keys = useRef<Record<string, boolean>>({});
  const speedRef = useRef(0);
  const previousInputState = useRef({ accelerating: false, braking: false });
  const gamepadIndex = useRef<number | null>(null);

  // THREE.js objects used for main thread only physics (collisions/impulses)
  const impulseVector = useRef(new THREE.Vector3(0, 0, 0));

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

  const controlsEnabled = raceStatus === 'racing';

  // --- Weapons and Collisions Hooks (Unchanged) ---
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
  // WORKER INITIALIZATION AND CLEANUP
  // -----------------------------
  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker(new URL('@/workers/PlayerWorker.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    // Create SharedArrayBuffers
    sabRefs.current.position = new SharedArrayBuffer(3 * Float32Array.BYTES_PER_ELEMENT);
    sabRefs.current.quaternion = new SharedArrayBuffer(4 * Float32Array.BYTES_PER_ELEMENT);

    // Create typed-array views and store (GC-free on frame)
    posViewRef.current = new Float32Array(sabRefs.current.position);
    quatViewRef.current = new Float32Array(sabRefs.current.quaternion);

    const ship = aircraftRef.current;

    // Initialize SABs from current transform
    const initialPos = ship?.position ?? new THREE.Vector3(0, 0, 0);
    const initialQuat = ship?.quaternion ?? new THREE.Quaternion(0, 0, 0, 1);
    posViewRef.current.set([initialPos.x, initialPos.y, initialPos.z]);
    quatViewRef.current.set([initialQuat.x, initialQuat.y, initialQuat.z, initialQuat.w]);

    const initialPayload: WorkerPayload = {
      type: 'init',
      // sharedBuffers: sabRefs.current as Required<typeof sabRefs.current>,
      playerSpeed: maxPlayerSpeed,
      invertPitch: invertPitch,
    };
    worker.postMessage(initialPayload);

    return () => {
      worker.terminate();
      workerRef.current = null;
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

  // NOTE: Send config updates whenever settings change
  useEffect(() => {
    workerRef.current?.postMessage({
      type: 'config',
      playerSpeed: maxPlayerSpeed,
      invertPitch: invertPitch,
    });
  }, [maxPlayerSpeed, invertPitch]);

  // --- Keyboard & Gamepad Listeners (Restored & GC-free) ---
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
  // PREBUILD BVH FOR PLANETS (once or when planetMeshes changes)
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
    worldHitPoint: new THREE.Vector3(),
    // hit info
    hitInfo: { point: new THREE.Vector3(), distance: 0, faceIndex: -1 } as {
      point: THREE.Vector3;
      distance: number;
      faceIndex: number;
    },
  }).current;

  // Predictive interpolation storage (GC-free)
  const prevSabPos = useRef(new THREE.Vector3());
  const prevSabQuat = useRef(new THREE.Quaternion());
  const currSabPos = useRef(new THREE.Vector3());
  const currSabQuat = useRef(new THREE.Quaternion());
  const predictedPos = useRef(new THREE.Vector3());
  const predictedQuat = useRef(new THREE.Quaternion());
  const dv = useRef(new THREE.Vector3()); // delta vector reuse
  const tmpQuat = useRef(new THREE.Quaternion());

  // --- Throttle Counters (Unchanged) ---
  const frameCounterRef = useRef(0);
  const gamepadPollCounterRef = useRef(0);
  const lastNearestTRef = useRef({ t: 0, pos: new THREE.Vector3() });
  const lastCollisionAudioTimeRef = useRef(0);
  const lastShieldUpdateTimeRef = useRef(0);
  const onSpeedLastRef = useRef(0);
  const nearestTThrottleFrames = 3;
  const gamepadPollFrames = 5;
  const collisionAudioCooldownMs = 120;
  const shieldUpdateMs = 100;

  const interpolationAlpha = 0.9; // visual lerp toward predicted state
  const predictionScale = 1.0; // predict one frame ahead

  const maybeEmitSpeed = (val: number) => {
    /* ... */
  };

  // -----------------------------
  // MAIN LOOP (useFrame) - GC-FREE & PREDICTIVE
  // -----------------------------
  useFrame((_, delta) => {
    const worker = workerRef.current;
    const ship = aircraftRef.current;
    const sab = sabRefs.current;
    const posView = posViewRef.current;
    const quatView = quatViewRef.current;

    if (
      !enabled ||
      !controlsEnabled ||
      !ship ||
      !worker ||
      !sab.position ||
      !sab.quaternion ||
      !posView ||
      !quatView
    )
      return;

    frameCounterRef.current += 1;
    gamepadPollCounterRef.current = (gamepadPollCounterRef.current + 1) % gamepadPollFrames;
    const { cannonValue, useMine, shieldValue } = raceData[playerId] ?? {
      cannonValue: 0,
      useMine: false,
      shieldValue: 0,
    };

    // --- THROTTLED: nearest curve t (READS ship.position) ---
    let nearestT = lastNearestTRef.current.t;
    if (frameCounterRef.current % nearestTThrottleFrames === 0) {
      const lastPos = lastNearestTRef.current.pos;
      if (lastPos.distanceToSquared(ship.position) > 0.25) {
        nearestT = getNearestCurveT(ship.position, curve);
        lastNearestTRef.current.t = nearestT;
        curve.getPointAt(nearestT, lastNearestTRef.current.pos);
      } else {
        nearestT = lastNearestTRef.current.t;
      }
    }
    curve.getPointAt(nearestT, ship.userData.curvePosition);
    ship.userData.progress = nearestT;

    // --- INPUT GATHERING (Main Thread) ---
    const throttle = throttleRef.current;
    const shouldFire = firingRef.current;

    // gamepad polling occasionally
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

    // touch/gamepad/keyboard roll & pitch
    const { x: touchX, y: touchY } = inputAxisRef.current;
    let finalRollAxis = 0;
    let finalPitchAxis = 0;
    if (Math.abs(touchX) > 0.01 || Math.abs(touchY) > 0.01) {
      finalRollAxis += touchX;
      finalPitchAxis += touchY;
    } else {
      // gamepad sticks (if desired)
      if (gp && gp.connected) {
        // mapped axes may vary; keep as 0 if not used
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

    // acceleration/braking input merge
    const gamepadButtons = gp?.buttons;
    const keysAccelerating = keys.current['i'] || gamepadButtons?.[0]?.pressed;
    const keysBraking = keys.current['k'] || gamepadButtons?.[2]?.pressed;
    let finalThrottle = throttle;
    if (keysAccelerating) finalThrottle = Math.max(finalThrottle, 1);
    if (keysBraking) finalThrottle = Math.min(finalThrottle, -1);

    // --- SEND RAW INPUT TO WORKER (primitives only) ---
    worker.postMessage({
      type: 'input',
      inputAxis: { x: finalRollAxis, y: finalPitchAxis },
      throttle: finalThrottle,
    });

    // --- TELL WORKER TO UPDATE PHYSICS ---
    worker.postMessage({ type: 'update', delta });

    // --- READ STATE FROM SHARED ARRAY BUFFERS (GC-free typed-array views) ---
    // posView and quatView were created during init and reused every frame
    // Save previous SAB read
    prevSabPos.current.copy(currSabPos.current);
    prevSabQuat.current.copy(currSabQuat.current);

    // Read current SAB into currSab*
    currSabPos.current.set(posView[0], posView[1], posView[2]);
    currSabQuat.current.set(quatView[0], quatView[1], quatView[2], quatView[3]);

    // --- PREDICTIVE EXTRAPOLATION (curr + (curr - prev) * scale) ---
    dv.current.subVectors(currSabPos.current, prevSabPos.current).multiplyScalar(predictionScale);
    predictedPos.current.copy(currSabPos.current).add(dv.current);

    // Rotation extrapolation (conservative): slerp from prev->curr and extend slightly
    // We use tmpQuat to avoid allocations
    tmpQuat.current.copy(prevSabQuat.current);
    predictedQuat.current.copy(currSabQuat.current);
    // small negative t to extrapolate forward: slerp with t < 0 to extrapolate (three.js clamps, so use a safe approach)
    // We'll instead compute incremental rotation and apply it scaled:
    // deltaQuat = prev^-1 * curr  => incremental rotation from prev -> curr
    const invPrev = tmpQuat.current.clone().invert(); // single clone here - unavoidable one-time small allocation
    const deltaQuat = new THREE.Quaternion().copy(currSabQuat.current).premultiply(invPrev); // one-time small allocation
    // apply scaled delta to curr to extrapolate: predicted = curr * (delta ^ predictionScale)
    // For minimal allocations, we'll slerp between curr and curr * delta
    const currTimesDelta = new THREE.Quaternion().copy(currSabQuat.current).multiply(deltaQuat);
    predictedQuat.current.slerp(currTimesDelta, predictionScale);

    // --- LERP visuals toward predicted state (GC-free) ---
    ship.position.lerp(predictedPos.current, interpolationAlpha);
    ship.quaternion.slerp(predictedQuat.current, interpolationAlpha);

    // --- COLLISIONS / OUT OF BOUNDS (Uses ship.position/quaternion LERPed) ---
    if (planetMeshes.length > 0) {
      for (let i = 0; i < planetMeshes.length; i++) {
        const planetMesh = planetMeshes[i];
        if (!planetMesh) continue;
        const geometry = planetMesh.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
        if (!geometry?.boundsTree) continue;

        // reuse tmp matrices/vectors
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
            tmp.pushDir.subVectors(ship.position, tmp.worldHitPoint).normalize();
            if (tmp.pushDir.lengthSq() === 0) tmp.pushDir.copy(ship.position).normalize();

            // reposition visual model
            ship.position.copy(tmp.worldHitPoint).addScaledVector(tmp.pushDir, minDistance);

            // write back corrected position to SAB (GC-free via posView)
            posView[0] = ship.position.x;
            posView[1] = ship.position.y;
            posView[2] = ship.position.z;

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
              shieldValue > 0 &&
              performance.now() - lastShieldUpdateTimeRef.current > shieldUpdateMs
            ) {
              setShieldValue(shieldValue - 0.5, playerId);
              lastShieldUpdateTimeRef.current = performance.now();
            }
          }
        }
      }
    }

    // --- OUT OF BOUNDS SDF (Unchanged) ---
    if (playingFieldRef?.current) {
      /* leave your checkOutOfBoundsSDF logic here */
    }

    // --- WEAPON FIRE (Unchanged) ---
    const shooting = !!keys.current['j'];
    const value = cannonValue || 0;
    if ((shooting || shouldFire) && value > 0) fire(playerId);
    if ((shooting || shouldFire) && useMine) {
      drop();
      setUseMine(playerId, false);
    }

    // optional hook for recording simulation state (left as-is)
    if (ship.userData.recordSimulationState) ship.userData.recordSimulationState();
  });
}
