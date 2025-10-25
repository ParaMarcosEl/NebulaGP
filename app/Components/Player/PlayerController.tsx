'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { MeshBVH } from 'three-mesh-bvh';
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
import { useFrame } from '@react-three/fiber';

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
  botSpeed: number;
  enabled: boolean;
  curve: THREE.Curve<THREE.Vector3>;
  onSpeedChange?: (speed: number) => void;
  onAcceleratingChange?: (state: boolean) => void;
  onBrakingChange?: (state: boolean) => void;
};

export function usePlayerController({
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
  curve,
  enabled,
  onSpeedChange,
  onAcceleratingChange,
  onBrakingChange,
}: PlayerSystemOptions) {
  // runtime refs
  const keys = useRef<Record<string, boolean>>({});
  const speedRef = useRef(0);
  const angularVelocity = useRef(new THREE.Vector3());
  const previousInputState = useRef({ accelerating: false, braking: false });
  const gamepadIndex = useRef<number | null>(null);

  const {
    raceStatus,
    playerSpeed,
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

  // weapons + collisions (unchanged API)
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

  // Initialize ship userData once
  useEffect(() => {
    const ship = aircraftRef.current;
    if (!ship) return;
    ship.userData.velocity = new THREE.Vector3(0, 0, 0);
    ship.userData.impulseVelocity = new THREE.Vector3();
    // keep a curvePosition vector to avoid cloning per-frame
    ship.userData.curvePosition = ship.userData.curvePosition ?? new THREE.Vector3();
    ship.userData.progress = ship.userData.progress ?? 0;
  }, [aircraftRef]);

  // keyboard listeners (unchanged)
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  // gamepad connect
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: GamepadEvent) => {
      if (gamepadIndex.current === null) {
        gamepadIndex.current = e.gamepad.index;
      }
    };
    window.addEventListener('gamepadconnected', handler);
    return () => window.removeEventListener('gamepadconnected', handler);
  }, [enabled]);

  // -----------------------------
  // PREBUILD BVH FOR PLANETS (once or when planetMeshes changes)
  // -----------------------------
  useEffect(() => {
    // Build boundsTree at load time to avoid building inside the frame loop
    for (const planetMesh of planetMeshes) {
      if (!planetMesh) continue;
      const geometry = planetMesh.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
      if (geometry && !geometry.boundsTree) {
        try {
          geometry.boundsTree = new MeshBVH(geometry);
        } catch (err) {
          // some geometries might not support BVH; skip gracefully
          // eslint-disable-next-line no-console
          console.warn('Failed to build BVH for planet mesh', err);
        }
      }
    }
  }, [planetMeshes]);

  // -----------------------------
  // TEMP OBJECTS (GC-free): use refs to persist across frames
  // -----------------------------
  const tmp = useRef({
    // math
    euler: new THREE.Euler(),
    quat: new THREE.Quaternion(),
    forward: new THREE.Vector3(),
    desiredVel: new THREE.Vector3(),
    localShipPos: new THREE.Vector3(),
    meshMatrixInverse: new THREE.Matrix4(),
    pushDir: new THREE.Vector3(),
    worldHitPoint: new THREE.Vector3(),
    // hit info (reuse same object; .point is a Vector3)
    hitInfo: { point: new THREE.Vector3(), distance: 0, faceIndex: -1 } as {
      point: THREE.Vector3;
      distance: number;
      faceIndex: number;
    },
  }).current;

  // throttle counters to reduce expensive calls frequency
  const frameCounterRef = useRef(0);
  const gamepadPollCounterRef = useRef(0);
  const lastNearestTRef = useRef({ t: 0, pos: new THREE.Vector3() });
  const lastCollisionAudioTimeRef = useRef(0);
  const lastShieldUpdateTimeRef = useRef(0);
  const onSpeedLastRef = useRef(0);
  const nearestTThrottleFrames = 3; // compute nearestT every N frames
  const gamepadPollFrames = 5; // poll actual gamepads every N frames
  const collisionAudioCooldownMs = 120; // don't spam sounds more frequent than this
  const shieldUpdateMs = 100; // throttle shield set calls

  // small helper: only call onSpeedChange when delta meaningful
  const maybeEmitSpeed = (val: number) => {
    const last = onSpeedLastRef.current;
    if (Math.abs(val - last) > 0.005) {
      onSpeedChange?.(val);
      onSpeedLastRef.current = val;
    }
  };

  // -----------------------------
  // MAIN LOOP (useFrame)
  // -----------------------------
  useFrame((_, delta) => {
    if (!enabled) return;
    const ship = aircraftRef.current;
    if (!controlsEnabled || !ship || !ship.userData || !ship.userData.velocity) return;

    // increment counters
    frameCounterRef.current += 1;
    gamepadPollCounterRef.current = (gamepadPollCounterRef.current + 1) % gamepadPollFrames;

    // --- THROTTLED: nearest curve t
    let nearestT = lastNearestTRef.current.t;
    if (frameCounterRef.current % nearestTThrottleFrames === 0) {
      // Only recompute when moved a bit or on throttle frame
      const lastPos = lastNearestTRef.current.pos;
      if (lastPos.distanceToSquared(ship.position) > 0.25 /* 0.5m movement squared */) {
        nearestT = getNearestCurveT(ship.position, curve);
        lastNearestTRef.current.t = nearestT;
        curve.getPointAt(nearestT, lastNearestTRef.current.pos);
      } else {
        // keep previous nearestT and lastPos
        nearestT = lastNearestTRef.current.t;
      }
    }
    // write into ship.userData.curvePosition without cloning
    curve.getPointAt(nearestT, ship.userData.curvePosition);
    ship.userData.progress = nearestT;

    // cached inputs
    const throttle = throttleRef.current;
    const shouldFire = firingRef.current;
    const DEAD_ZONE = 0.1;

    // GAMEPAD POLLING: only poll navigator.getGamepads occasionally
    let gp: Gamepad | undefined;
    if (gamepadPollCounterRef.current === 0 && typeof navigator.getGamepads === 'function') {
      const gamepads = navigator.getGamepads();
      gp =
        gamepadIndex.current !== null
          ? (gamepads?.[gamepadIndex.current] ?? undefined)
          : gamepads?.[0] || undefined;
    } else {
      // reuse previous poll if available
      gp = undefined;
    }

    const { x: touchX, y: touchY } = inputAxisRef.current;

    // --- ROTATION INPUT (scaled by delta) - reuse temp vectors & objects
    if (Math.abs(touchX) > 0.01 || Math.abs(touchY) > 0.01) {
      angularVelocity.current.z += touchX * -pitchVelocity * delta * 60;
      angularVelocity.current.x += touchY * rollVelocity * delta * 60;
    } else {
      let lx = 0,
        ly = 0;
      if (gp && gp.connected) {
        lx = Math.abs(gp.axes[0]) > DEAD_ZONE ? gp.axes[0] : 0;
        ly = Math.abs(gp.axes[1]) > DEAD_ZONE ? gp.axes[1] : 0;
      }
      angularVelocity.current.z += lx * -pitchVelocity * delta * 60;
      angularVelocity.current.x += ly * rollVelocity * delta * 60;

      if (keys.current['a']) angularVelocity.current.z += pitchVelocity * delta * 60;
      if (keys.current['d']) angularVelocity.current.z -= pitchVelocity * delta * 60;
      if (keys.current['w']) angularVelocity.current.x -= rollVelocity * delta * 60;
      if (keys.current['s']) angularVelocity.current.x += rollVelocity * delta * 60;
    }

    // determine actions
    // if gp is undefined because we didn't poll this frame, we still allow keyboard and throttle
    const gamepadButtons = gp?.buttons;
    const accelerating = !!(keys.current['i'] || gamepadButtons?.[0]?.pressed || throttle > 0);
    const braking = !!(keys.current['k'] || gamepadButtons?.[2]?.pressed || throttle < 0);
    const shooting = !!(keys.current['j'] || gamepadButtons?.[7]?.pressed);
    const { cannonValue, useMine, shieldValue } = raceData[playerId] ?? {
      cannonValue: 0,
      useMine: false,
      shieldValue: 0,
    };

    // only emit these callbacks on change
    if (accelerating !== previousInputState.current.accelerating) {
      onAcceleratingChange?.(accelerating);
      previousInputState.current.accelerating = accelerating;
    }
    if (braking !== previousInputState.current.braking) {
      onBrakingChange?.(braking);
      previousInputState.current.braking = braking;
    }

    // --- ACCELERATION & BRAKING (scaled by delta)
    if (accelerating || throttle > 0) {
      speedRef.current = Math.min(
        playerSpeed,
        isMobileDevice()
          ? (speedRef.current + acceleration * delta * 60) * Math.abs(throttle)
          : speedRef.current + acceleration * delta * 60,
      );
    } else if (!braking) {
      speedRef.current *= Math.pow(damping, delta * 60);
    }

    if (braking || throttle < 0) {
      speedRef.current = Math.max(
        -playerSpeed * 0.5,
        isMobileDevice()
          ? speedRef.current - acceleration * Math.abs(throttle) * delta * 60
          : speedRef.current - acceleration * delta * 60,
      );
    }

    if (Math.abs(speedRef.current) < 0.001) {
      speedRef.current = 0;
      ship.userData.velocity.set(0, 0, 0);
    }

    // only call onSpeedChange if meaningful change
    maybeEmitSpeed(speedRef.current);

    // --- APPLY ROTATION (GC-free)
    // reuse tmp.euler & tmp.quat
    tmp.euler.set(
      angularVelocity.current.x * invertPitch,
      angularVelocity.current.y,
      angularVelocity.current.z,
      'XYZ',
    );
    tmp.quat.setFromEuler(tmp.euler);
    ship.quaternion.multiply(tmp.quat);
    angularVelocity.current.multiplyScalar(0.5);

    // --- FORWARD MOVEMENT (gc-free)
    tmp.forward.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
    tmp.desiredVel.copy(tmp.forward).multiplyScalar(speedRef.current);
    const lerpFactor = Math.max(0.05, Math.min(1, Math.abs(speedRef.current)));
    ship.userData.velocity.lerp(tmp.desiredVel, lerpFactor);

    // --- APPLY IMPULSE VELOCITY (mutating existing vectors)
    if (ship.userData.impulseVelocity) {
      ship.userData.velocity.add(ship.userData.impulseVelocity);
      ship.userData.impulseVelocity.multiplyScalar(Math.pow(0.9, delta * 60));
    }

    // --- UPDATE POSITION (scaled by delta)
    ship.position.addScaledVector(ship.userData.velocity, delta * 60);

    // --- COLLISIONS / OUT OF BOUNDS
    if (planetMeshes.length > 0) {
      // iterate planets, use prebuilt BVH, and reuse tmp objects
      for (const planetMesh of planetMeshes) {
        if (!planetMesh) continue;
        const geometry = planetMesh.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };

        // skip if no BVH
        if (!geometry?.boundsTree) continue;

        // copy inverse matrix into tmp
        tmp.meshMatrixInverse.copy(planetMesh.matrixWorld).invert();
        tmp.localShipPos.copy(ship.position).applyMatrix4(tmp.meshMatrixInverse);

        // perform closest point query (reuses hitInfo.point)
        const hit = tmp.hitInfo;
        // reset hit distance to avoid stale values
        hit.distance = 0;
        hit.faceIndex = -1;

        if (geometry.boundsTree.closestPointToPoint(tmp.localShipPos, hit)) {
          // compute world hit point in reusable tmp.worldHitPoint
          tmp.worldHitPoint.copy(hit.point).applyMatrix4(planetMesh.matrixWorld);
          const dist = ship.position.distanceTo(tmp.worldHitPoint);
          const minDistance = 6;
          if (dist < minDistance) {
            // compute pushDir in-place
            tmp.pushDir.subVectors(ship.position, tmp.worldHitPoint).normalize();
            if (tmp.pushDir.lengthSq() === 0) tmp.pushDir.copy(ship.position).normalize();

            // reposition ship relative to worldHitPoint using tmp vectors
            ship.position.copy(tmp.worldHitPoint).addScaledVector(tmp.pushDir, minDistance);

            if (ship.userData.velocity) {
              ship.userData.velocity.multiplyScalar(0.5);
              speedRef.current *= 0.99;
            }

            // play sound with cooldown to avoid audio spam
            const now = performance.now();
            if (
              audioEnabled &&
              now - lastCollisionAudioTimeRef.current > collisionAudioCooldownMs
            ) {
              playSound?.(buffers['clank04'], ship.position, 1, 3);
              lastCollisionAudioTimeRef.current = now;
            }

            // throttle shield updates (don't call setShieldValue every frame)
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

    // --- OUT OF BOUNDS SDF (unchanged but called each frame)
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

    // --- WEAPON FIRE (unchanged, but firingRef + throttles used above)
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
