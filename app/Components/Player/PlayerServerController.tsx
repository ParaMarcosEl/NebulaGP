'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Mine, useMines } from '../Weapons/useMines';
import { useProjectileCollisions } from '@/Controllers/Collision/useProjectileCollisions';
import { onBulletCollision } from '@/Utils/collisions';
import { TUBE_RADIUS } from '@/Constants';
import { useSettingsStore } from '@/Controllers/Settings/useSettingsStore';
import { useProjectiles } from '../Weapons/useProjectiles';
import { checkOutOfBoundsSDF } from '@/Utils/SDF';
import { ExplosionHandle } from '../Particles/ExplosionParticles/ExplosionParticles';
import { FBMParams } from '@/Components/LODTerrain/Planet/fbm';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import type { PhysicsUpdatePayload } from '@/Lib/multiplayer/MultiplayerClient';

function catmullRom(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
) {
  const t2 = t * t;
  const t3 = t2 * t;

  out.set(
    0.5 *
      ((2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 *
      ((2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 *
      ((2 * p1.z) +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );

  return out;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const INTERPOLATION_TIME = 100;
const GAMEPAD_POLL_FRAMES = 5;

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
  id: string;
  trackId: number;
  minePoolRef: React.RefObject<Mine[]>;
  explosionsRef?: React.RefObject<ExplosionHandle>;
  aircraftRef: React.RefObject<THREE.Group | null>;
  playerRefs: React.RefObject<THREE.Group | null>[];
  obstacleRefs?: React.RefObject<THREE.Mesh | null>[];
  playingFieldRef?: React.RefObject<THREE.Mesh | null>;
  fbmParams?: FBMParams;
  planetSize?: number;
  pitchVelocity?: number;
  rollVelocity?: number;
  acceleration?: number;
  damping?: number;
  noiseAmplitude?: number;
  noiseFrequency?: number;
  botSpeed: number;
  enabled: boolean;
  onSpeedChange?: (speed: number) => void;
  onAcceleratingChange?: (state: boolean) => void;
  onBrakingChange?: (state: boolean) => void;
};

export function usePlayerServerController({
  id: playerId,
  minePoolRef,
  explosionsRef,
  aircraftRef,
  playerRefs,
  playingFieldRef,
  acceleration = 10,
  pitchVelocity = 3,
  rollVelocity = 6,
  damping = 0.998,
}: PlayerSystemOptions) {
  const {
    playerSpeed,
    raceData,
    setOutOfBounds,
    addOutOfBoundsTime,
    track: curve,
  } = useGameStore((s) => s);
  const { invertPitch } = useSettingsStore((s) => s);
  const multiplayerClient = useUserStore((s) => s.multiplayerClient);

  const keys = useRef<Record<string, boolean>>({});
  const gamepadIndex = useRef<number | null>(null);

  const serverStates = useRef<
    Array<{ time: number; pos: THREE.Vector3; quat: THREE.Quaternion; velocity?: THREE.Vector3 }>
  >([]);

  const gamepadPollCounterRef = useRef(0);
  const smoothedCameraTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  const tmp = useRef({
    interpPos: new THREE.Vector3(),
    interpQuat: new THREE.Quaternion(),
    velocity: new THREE.Vector3(),
  }).current;

  const aircraftObjectRef = aircraftRef as React.RefObject<THREE.Object3D>;
  const explosionHandleRef = explosionsRef as React.RefObject<ExplosionHandle>;

  const { fire, poolRef: projectilePoolRef } = useProjectiles(aircraftObjectRef, explosionHandleRef, {
    fireRate: 5,
    maxProjectiles: 20,
    velocity: 400,
  });

  const { drop } = useMines(aircraftObjectRef, minePoolRef, explosionHandleRef, {
    maxMines: 16,
    dropOffset: 6,
  });

  useProjectileCollisions({
    projectiles: projectilePoolRef.current,
    playerRefs,
    explosionsRef: explosionHandleRef,
    onCollide: onBulletCollision,
  });

  useEffect(() => {
    if (!multiplayerClient) return;

    multiplayerClient.send('config', {
      acceleration,
      pitchVelocity,
      rollVelocity,
      damping,
      playerSpeed,
      invertPitch: invertPitch ? -1 : 1,
      curvePoints: curve.getPoints(200).map((p) => [p.x, p.y, p.z]),
    });
  }, [
    acceleration,
    curve,
    damping,
    invertPitch,
    multiplayerClient,
    pitchVelocity,
    playerSpeed,
    rollVelocity,
  ]);

  useEffect(() => {
    if (!multiplayerClient) return;

    multiplayerClient.send('config', {
      playerSpeed,
      invertPitch: invertPitch ? -1 : 1,
    });
  }, [invertPitch, multiplayerClient, playerSpeed]);

  useEffect(() => {
    if (!multiplayerClient) return;

    const interval = window.setInterval(() => {
      multiplayerClient.send('input', {
        throttle: throttleRef.current,
        inputAxis: inputAxisRef.current,
      });
    }, 33);

    return () => window.clearInterval(interval);
  }, [multiplayerClient]);

  useEffect(() => {
    const client = multiplayerClient;
    const MOVEMENT_KEYS = ['a', 'd', 'w', 's'];
    const THROTTLE_KEYS = ['i', 'k'];
    const ALL_INPUT_KEYS = [...MOVEMENT_KEYS, ...THROTTLE_KEYS];

    const calculateInput = (currentKeys: Record<string, boolean>) => {
      let rollInput = 0;
      let pitchInput = 0;

      if (currentKeys.d) rollInput -= 1;
      if (currentKeys.a) rollInput += 1;
      if (currentKeys.w) pitchInput -= 1;
      if (currentKeys.s) pitchInput += 1;

      return {
        x: clamp(rollInput, -1, 1),
        y: clamp(pitchInput, -1, 1),
      };
    };

    const calculateThrottle = (currentKeys: Record<string, boolean>) => {
      if (currentKeys.i) return 1;
      if (currentKeys.k) return -1;
      return 0;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (ALL_INPUT_KEYS.includes(key) && !keys.current[key]) {
        keys.current[key] = true;

        if (client) {
          const newInputAxis = calculateInput(keys.current);
          const newThrottle = calculateThrottle(keys.current);

          inputAxisRef.current = newInputAxis;
          throttleRef.current = newThrottle;

          client.send('input', {
            throttle: newThrottle,
            inputAxis: newInputAxis,
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (ALL_INPUT_KEYS.includes(key) && keys.current[key]) {
        keys.current[key] = false;

        if (client) {
          const newInputAxis = calculateInput(keys.current);
          const newThrottle = calculateThrottle(keys.current);

          inputAxisRef.current = newInputAxis;
          throttleRef.current = newThrottle;

          client.send('input', {
            throttle: newThrottle,
            inputAxis: newInputAxis,
          });
        }
      }
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
  }, [multiplayerClient]);

  useEffect(() => {
    if (!multiplayerClient) return;

    const handlePhysicsUpdate = (payload: PhysicsUpdatePayload) => {
      const localPlayerId = multiplayerClient.playerId;
      if (!localPlayerId) return;

      const newPhysicsState = payload.state[localPlayerId];
      if (!newPhysicsState) return;

      const [x, y, z] = newPhysicsState.pos;
      const [qx, qy, qz, qw] = newPhysicsState.rot;
      const time = Date.now();

      const velocityArr = newPhysicsState.vel ?? newPhysicsState.velocity;
      let velocityVec: THREE.Vector3 | undefined;

      if (velocityArr && velocityArr.length >= 3) {
        velocityVec = new THREE.Vector3(velocityArr[0], velocityArr[1], velocityArr[2]);
      }

      serverStates.current.push({
        time,
        pos: new THREE.Vector3(x, y, z),
        quat: new THREE.Quaternion(qx, qy, qz, qw),
        velocity: velocityVec,
      });

      if (serverStates.current.length > 20) {
        serverStates.current.shift();
      }
    };

    const unsubscribe = multiplayerClient.on<PhysicsUpdatePayload>('physics:update', handlePhysicsUpdate);

    return () => {
      unsubscribe();
    };
  }, [multiplayerClient]);

  useFrame((_, delta) => {
    const ship = aircraftRef.current;
    if (!ship) return;

    gamepadPollCounterRef.current = (gamepadPollCounterRef.current + 1) % GAMEPAD_POLL_FRAMES;

    const keysState = keys.current;
    const shouldFire = firingRef.current;

    let gp: Gamepad | null | undefined;
    if (gamepadPollCounterRef.current === 0 && typeof navigator.getGamepads === 'function') {
      const gps = navigator.getGamepads();
      gp = gamepadIndex.current !== null ? (gps?.[gamepadIndex.current] ?? undefined) : gps?.[0];
    }

    let rollInput = 0;
    let pitchInput = 0;

    const { x: touchX, y: touchY } = inputAxisRef.current;
    if (Math.abs(touchX) > 0.01 || Math.abs(touchY) > 0.01) {
      rollInput += touchX;
      pitchInput += touchY;
    } else {
      if (gp?.connected) {
        rollInput += gp.axes?.[0] ?? 0;
        pitchInput += gp.axes?.[1] ?? 0;
      }
      if (keysState.a) rollInput -= 1;
      if (keysState.d) rollInput += 1;
      if (keysState.w) pitchInput -= 1;
      if (keysState.s) pitchInput += 1;
    }

    rollInput = clamp(rollInput, -1, 1);
    pitchInput = clamp(pitchInput, -1, 1);

    let throttleInput = 0;
    if (keysState.i) throttleInput = 1;
    else if (keysState.k) throttleInput = -1;

    inputAxisRef.current = { x: rollInput, y: pitchInput };
    throttleRef.current = throttleInput;

    const numericPlayerId = Number(playerId);
    const cannonValue = raceData[numericPlayerId]?.cannonValue || 0;
    const useMine = raceData[numericPlayerId]?.useMine;

    if ((keysState.j || shouldFire) && cannonValue > 0) fire(numericPlayerId);
    if ((keysState.j || shouldFire) && useMine) drop();

    if (serverStates.current.length > 0) {
      const targetTime = Date.now() - INTERPOLATION_TIME;

      while (serverStates.current.length > 1 && serverStates.current[1].time <= targetTime) {
        serverStates.current.shift();
      }

      const buf = serverStates.current;

      if (buf.length >= 3) {
        const s0 = buf[0];
        const s1 = buf[1];

        const denom = s1.time - s0.time;
        const t = denom > 0 ? clamp((targetTime - s0.time) / denom, 0, 1) : 0;

        const sMinus1 = buf[0];
        const sPlus2 = buf[2];

        catmullRom(sMinus1.pos, s0.pos, s1.pos, sPlus2.pos, t, tmp.interpPos);
        tmp.interpQuat.copy(s0.quat).slerp(s1.quat, t);

        ship.position.copy(tmp.interpPos);
        ship.quaternion.copy(tmp.interpQuat);
      } else {
        const s = buf[0];
        const deltaExtrap = (Date.now() - s.time) / 1000;

        if (s.velocity) {
          tmp.interpPos.copy(s.pos).add(tmp.velocity.copy(s.velocity).multiplyScalar(deltaExtrap));
          ship.position.copy(tmp.interpPos);
        } else {
          ship.position.copy(s.pos);
        }
        ship.quaternion.copy(s.quat);
      }
    }

    if (playingFieldRef?.current) {
      checkOutOfBoundsSDF(
        ship,
        curve,
        TUBE_RADIUS,
        [{ t: 0.4, radius: 100 }],
        Number(playerId),
        delta,
        raceData,
        setOutOfBounds,
        addOutOfBoundsTime,
      );
    }

    const cameraTarget = smoothedCameraTargetRef.current;
    const cameraPositionLag = 0.15;
    const cameraRotationLag = 0.1;

    const positionAlpha = 1 - Math.exp(-delta / cameraPositionLag);
    const rotationAlpha = 1 - Math.exp(-delta / cameraRotationLag);

    cameraTarget.position.lerp(ship.position, positionAlpha);
    cameraTarget.quaternion.slerp(ship.quaternion, rotationAlpha);
    ship.userData.smoothedCameraTarget = cameraTarget;

    if (ship.userData.recordSimulationState) ship.userData.recordSimulationState();
  });
}
