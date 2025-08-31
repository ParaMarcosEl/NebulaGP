'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBVH } from 'three-mesh-bvh';
import { useGameStore } from '@/Controllers/Game/GameController';
import { getNearestCurveT, isMobileDevice } from '@/Utils';
import { useBotController } from '@/Components/Player/BotController';
import { Mine, useMines } from '../Weapons/useMines';
import { useProjectileCollisions } from '@/Controllers/Collision/useProjectileCollisions';
import { onBulletCollision } from '@/Utils/collisions';
import { useGhostRecorder } from './GhostRecorder/useGhostRecorder';
import { TOTAL_LAPS } from '@/Constants';
import { useSettingsStore } from '@/Controllers/Settings/useSettingsStore';
import { MineExplosionHandle } from '../Particles/ExplosionParticles';
import { useProjectiles } from '../Weapons/useProjectiles';

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
  explosionPoolRef?: React.RefObject<React.RefObject<MineExplosionHandle>[]>;
  aircraftRef: React.RefObject<THREE.Group | null>;
  playerRefs: React.RefObject<THREE.Group | null>[];
  obstacleRefs?: React.RefObject<THREE.Mesh | null>[];
  playingFieldRef?: React.RefObject<THREE.Mesh | null>;
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
  trackId,
  minePoolRef,
  explosionPoolRef,
  aircraftRef,
  playerRefs,
  playingFieldRef,
  acceleration = 0.1,
  damping = 0.5,
  botSpeed,
  curve,
  enabled,
  onSpeedChange,
  onAcceleratingChange,
  onBrakingChange,
}: PlayerSystemOptions) {
  const keys = useRef<Record<string, boolean>>({});
  const speedRef = useRef(0);
  const angularVelocity = useRef(new THREE.Vector3());
  const previousInputState = useRef({ accelerating: false, braking: false });
  const gamepadIndex = useRef<number | null>(null);
  const { raceStatus, playerSpeed, raceData, setUseMine, setShieldValue } = useGameStore(
    (state) => state,
  );
  const { invertPitch } = useSettingsStore((s) => s);

  const controlsEnabled = raceStatus === 'racing';
  useBotController({
    id: playerId,
    playerRefs,
    minePoolRef,
    enabled: controlsEnabled || raceData[playerId]?.history?.length >= TOTAL_LAPS || !enabled,
    botRef: aircraftRef,
    curve,
    speed: botSpeed,
    explosionPoolRef,
  });

  const { stopRecording } = useGhostRecorder({
    trackId,
    mode: 'record',
    targetRef: aircraftRef as React.RefObject<THREE.Object3D>,
    onRecordingComplete: () => {},
  });

  const { fire, poolRef } = useProjectiles(
    aircraftRef as React.RefObject<THREE.Object3D>,
    explosionPoolRef as React.RefObject<React.RefObject<MineExplosionHandle>[]>,
    {
      fireRate: 5,
      maxProjectiles: 20,
      velocity: 400,
    },
  );

  const { drop } = useMines(
    aircraftRef as React.RefObject<THREE.Object3D>,
    minePoolRef,
    // Pass the ref directly, without .current, as useMines expects a RefObject
    explosionPoolRef as React.RefObject<React.RefObject<MineExplosionHandle>[]>,
    {
      maxMines: 16,
      dropOffset: 6,
    },
  );

  useProjectileCollisions({
    projectiles: poolRef.current,
    playerRefs,
    explosionPoolRef: explosionPoolRef as React.RefObject<React.RefObject<MineExplosionHandle>[]>,
    onCollide: onBulletCollision,
    owner: aircraftRef,
  });
  const playerHistory = raceData[0].history;

  useEffect(() => {
    if (playerHistory.length < TOTAL_LAPS) return;
    stopRecording();
  }, [playerHistory.length, playerId, stopRecording]);

  useEffect(() => {
    const ship = aircraftRef.current;
    if (!ship) return;
    ship.userData.velocity = new THREE.Vector3(0, 0, 0);
    ship.userData.impulseVelocity = new THREE.Vector3();
  }, [aircraftRef]);

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

  useFrame(() => {
    if (!enabled) return;
    const ship = aircraftRef.current;
    if (!controlsEnabled || !ship || !ship.userData.velocity) return;
    const nearestT = getNearestCurveT(ship.position, curve);
    const curvePosition = curve.getPointAt(nearestT);
    ship.userData.curvePosition = curvePosition.clone();
    ship.userData.progress = nearestT;

    const throttle = throttleRef.current;
    const shouldFire = firingRef.current;
    const DEAD_ZONE = 0.1;
    const gamepads = navigator.getGamepads?.();
    const gp = gamepadIndex.current !== null ? gamepads?.[gamepadIndex.current] : gamepads?.[0];
    let lx = 0,
      ly = 0;

    const { x: touchX, y: touchY } = inputAxisRef.current;

    if (Math.abs(touchX) > 0.01 || Math.abs(touchY) > 0.01) {
      angularVelocity.current.z += touchX * -0.03;
      angularVelocity.current.x += touchY * 0.01;
    } else {
      if (gp && gp.connected) {
        lx = Math.abs(gp.axes[0]) > DEAD_ZONE ? gp.axes[0] : 0;
        ly = Math.abs(gp.axes[1]) > DEAD_ZONE ? gp.axes[1] : 0;
      }
      angularVelocity.current.z += lx * -0.03;
      angularVelocity.current.x += ly * 0.01;

      if (keys.current['a']) angularVelocity.current.z += 0.03;
      if (keys.current['d']) angularVelocity.current.z -= 0.03;
      if (keys.current['w']) angularVelocity.current.x -= 0.01;
      if (keys.current['s']) angularVelocity.current.x += 0.01;
    }

    const accelerating = !!(keys.current['i'] || gp?.buttons?.[0]?.pressed || throttle > 0);
    const braking = !!(keys.current['k'] || gp?.buttons?.[2]?.pressed || throttle < 0);
    const shooting = !!(keys.current['j'] || gp?.buttons?.[7]?.pressed);
    const { cannonValue, useMine, shieldValue } = raceData[playerId];

    if (accelerating !== previousInputState.current.accelerating) {
      onAcceleratingChange?.(accelerating);
      previousInputState.current.accelerating = accelerating;
    }
    if (braking !== previousInputState.current.braking) {
      onBrakingChange?.(braking);
      previousInputState.current.braking = braking;
    }

    if (accelerating || throttle > 0) {
      speedRef.current = Math.min(
        playerSpeed,
        isMobileDevice()
          ? (speedRef.current + acceleration) * Math.abs(throttle)
          : speedRef.current + acceleration,
      );
    } else if (!braking) {
      speedRef.current *= damping;
    }

    if (braking || throttle < 0) {
      speedRef.current = Math.max(
        -1,
        isMobileDevice()
          ? speedRef.current - acceleration * 2 * Math.abs(throttle)
          : speedRef.current - acceleration * 2,
      );
    }

    if (Math.abs(speedRef.current) < 0.001) {
      speedRef.current = 0;
      ship.userData.velocity.set(0, 0, 0);
    }

    onSpeedChange?.(speedRef.current);

    const deltaRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        angularVelocity.current.x * invertPitch,
        angularVelocity.current.y,
        angularVelocity.current.z,
        'XYZ',
      ),
    );
    ship.quaternion.multiply(deltaRotation);
    angularVelocity.current.multiplyScalar(0.5);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
    const desiredVelocity = forward.multiplyScalar(speedRef.current);
    const lerpFactor = Math.max(0.05, Math.min(1, Math.abs(speedRef.current)));
    ship.userData.velocity.lerp(desiredVelocity, lerpFactor);

    if (ship.userData.impulseVelocity) {
      ship.userData.velocity.add(ship.userData.impulseVelocity);
      ship.userData.impulseVelocity.multiplyScalar(0.9);
    }
    ship.position.add(ship.userData.velocity);

    if (playingFieldRef?.current) {
      const field = playingFieldRef.current;
      const geometry = field.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
      if (!geometry.boundsTree) geometry.boundsTree = new MeshBVH(geometry);
      const raycaster = new THREE.Raycaster();
      raycaster.ray.origin.copy(ship.position).add(new THREE.Vector3(0, 1000, 0));
      raycaster.ray.direction.set(0, -1, 0);
      raycaster.firstHitOnly = false;
      const hits = raycaster.intersectObject(field);

      if (hits.length === 0) {
        const hitInfo = { point: new THREE.Vector3(), distance: 0, faceIndex: -1 };
        if (geometry.boundsTree.closestPointToPoint(ship.position, hitInfo)) {
          const dist = ship.position.distanceTo(hitInfo.point);
          if (dist > 10) {
            if (shieldValue > 0) {
              setShieldValue(shieldValue - 0.5, playerId);
            }
            ship.position.copy(hitInfo.point);
            ship.userData.velocity.multiplyScalar(-1);
            speedRef.current = 0;
          }
        }
      }
    }

    const value = cannonValue || 0;
    if ((shooting || shouldFire) && value > 0) {
      fire(playerId);
    }
    if ((shooting || shouldFire) && useMine) {
      drop();
      setUseMine(playerId, false);
    }
  });
}
