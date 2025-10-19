'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useRef } from 'react';
import {
  getNearestCurveT,
  getWaypointsAlongCurve,
  computePitchInput,
  computeRollInput,
} from '@/Utils';
import { onBulletCollision } from '@/Utils/collisions';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useProjectileCollisions } from '@/Controllers/Collision/useProjectileCollisions';
import { Mine, useMines } from '../Weapons/useMines';
import { useProjectiles } from '../Weapons/useProjectiles';
import { ExplosionHandle } from '../Particles/ExplosionParticles/ExplosionParticles';

interface UseBotControllerProps {
  id: number;
  botRef: React.RefObject<THREE.Group | null>;
  minePoolRef: React.RefObject<Mine[]>;
  playerRefs: React.RefObject<THREE.Group | null>[];
  curve: THREE.Curve<THREE.Vector3>;
  speed?: number;
  maxSpeed?: number;
  acceleration?: number;
  enabled?: boolean;
  onSpeedChange?: (speed: number) => void;
  explosionsRef?: React.RefObject<ExplosionHandle>;
}

const ROLL_TORQUE = 7;
const PITCH_TORQUE = -1;

// Tunables for performance
const NEAREST_T_INTERVAL = 0.2; // seconds between full nearestT computations
const FIRE_COOLDOWN_MS = 200; 
const MINE_DROP_COOLDOWN_MS = 1500;
const NORMALIZE_EVERY_N_FRAMES = 10;

export function useBotController({
  id,
  botRef,
  playerRefs,
  minePoolRef,
  curve,
  speed = 0,
  maxSpeed = 2.75,
  acceleration = 5,
  enabled = true,
  onSpeedChange,
  explosionsRef,
}: UseBotControllerProps) {
  // refs & state-like refs (not React state)
  const currentTRef = useRef(0);
  const waypointsRef = useRef<THREE.Vector3[]>([]);
  const waypointIndexRef = useRef(8);
  const speedRef = useRef(0);
  const lastNearestTTime = useRef(-Infinity);
  const lastFireTime = useRef(0);
  const lastMineTime = useRef(0);
  const frameCounter = useRef(0);


  const { raceStatus, raceData, setUseMine } = useGameStore((s) => s);

  // Preallocated temporaries to avoid allocations each frame
  const tmpToWaypoint = useRef(new THREE.Vector3());
  const tmpDesiredDir = useRef(new THREE.Vector3());
  const tmpAccelerationVec = useRef(new THREE.Vector3());
  const tmpForward = useRef(new THREE.Vector3());
  const tmpUp = useRef(new THREE.Vector3());
  const tmpEuler = useRef(new THREE.Euler(0, 0, 0, 'XYZ'));
  const tmpDeltaQuat = useRef(new THREE.Quaternion());
  const tmpDesiredVelocity = useRef(new THREE.Vector3());

  // Projectiles and mines
  const { fire, poolRef } = useProjectiles(
    botRef as React.RefObject<THREE.Object3D>,
    explosionsRef as React.RefObject<ExplosionHandle>,
    {
      fireRate: 5,
      maxProjectiles: 20,
      velocity: 400,
    },
  );

  const { drop } = useMines(
    botRef as React.RefObject<THREE.Object3D>,
    minePoolRef,
    explosionsRef as React.RefObject<ExplosionHandle>,
  );

  useProjectileCollisions({
    projectiles: poolRef.current,
    playerRefs,
    onCollide: onBulletCollision,
    owner: botRef,
    explosionsRef: explosionsRef as React.RefObject<ExplosionHandle>,
  });

  // Ensure bot has impulseVelocity on first mount
  useEffect(() => {
    const bot = botRef.current;
    if (bot && !bot.userData.impulseVelocity) {
      bot.userData.impulseVelocity = new THREE.Vector3();
    }
  }, [botRef]);

  // Build waypoints once (or when curve changes)
  useEffect(() => {
    waypointsRef.current = getWaypointsAlongCurve(curve, 0.01, 0.99, 0.01);

    // seed currentTRef to nearest curve position
    const bot = botRef.current;
    if (bot) {
      currentTRef.current = getNearestCurveT(bot.position, curve);
    }
  }, [curve, botRef]);

  useImperativeHandle(botRef, () => botRef.current as THREE.Group, [botRef]);

  useFrame((_, delta) => {
    const bot = botRef.current;
    if (!bot || !enabled || raceStatus !== 'racing') return;

    frameCounter.current++;
    const now = performance.now() / 1000;

    // === Predictive curve position ===
    if (now - lastNearestTTime.current > NEAREST_T_INTERVAL) {
      currentTRef.current = getNearestCurveT(bot.position, curve);
      lastNearestTTime.current = now;
    } else {
      const step = speedRef.current * delta / 100; // scale for prediction
      currentTRef.current = (currentTRef.current + step) % 1;
    }

    const curvePosition = curve.getPointAt(currentTRef.current);
    if (!bot.userData.curvePosition) bot.userData.curvePosition = new THREE.Vector3();
    bot.userData.curvePosition.copy(curvePosition);
    bot.userData.progress = currentTRef.current;

    // === Movement logic ===
    const waypoints = waypointsRef.current;
    if (!waypoints || waypoints.length === 0) return;

    let currentWaypoint = waypoints[waypointIndexRef.current];
    tmpToWaypoint.current.subVectors(currentWaypoint, bot.position);
    let distance = tmpToWaypoint.current.length();

    if (distance < 50) {
      waypointIndexRef.current = (waypointIndexRef.current + 1) % waypoints.length;
      currentWaypoint = waypoints[waypointIndexRef.current];
      tmpToWaypoint.current.subVectors(currentWaypoint, bot.position);
      distance = tmpToWaypoint.current.length();
    }

    // Orientation
    tmpForward.current.set(0, 0, -1).applyQuaternion(bot.quaternion);
    tmpUp.current.set(0, 1, 0).applyQuaternion(bot.quaternion);

    const angle = tmpForward.current.angleTo(tmpToWaypoint.current.clone().normalize());

    const pitch = computePitchInput(tmpForward.current, tmpToWaypoint.current, tmpUp.current) * PITCH_TORQUE;
    const roll = computeRollInput(tmpForward.current, tmpToWaypoint.current, tmpUp.current) * ROLL_TORQUE;

    speedRef.current = angle < 0.4 ? speed : speed * 0.5;
    if (angle > 1.0) speedRef.current *= 0.5;

    tmpEuler.current.set(pitch * delta, 0, roll * delta, 'XYZ');
    tmpDeltaQuat.current.setFromEuler(tmpEuler.current);
    bot.quaternion.multiply(tmpDeltaQuat.current);

    if ((frameCounter.current % NORMALIZE_EVERY_N_FRAMES) === 0) bot.quaternion.normalize();

    // Translation
    tmpDesiredDir.current.copy(tmpToWaypoint.current).normalize();
    tmpAccelerationVec.current.copy(tmpDesiredDir.current).multiplyScalar(acceleration);

    tmpForward.current.set(0, 0, -1).applyQuaternion(bot.quaternion);

    if (!bot.userData.velocity) bot.userData.velocity = new THREE.Vector3();
    if (!bot.userData.impulseVelocity) bot.userData.impulseVelocity = new THREE.Vector3();

    tmpDesiredVelocity.current.copy(tmpForward.current).multiplyScalar(speedRef.current);
    const lerpFactor = Math.max(0.05, Math.min(1, Math.abs(speedRef.current)));
    bot.userData.velocity.lerp(tmpDesiredVelocity.current, lerpFactor);

    bot.userData.velocity.add(bot.userData.impulseVelocity);
    bot.userData.impulseVelocity.multiplyScalar(0.9);

    bot.userData.velocity.add(tmpAccelerationVec.current);

    if (bot.userData.velocity.length() > maxSpeed) {
      bot.userData.velocity.normalize().multiplyScalar(maxSpeed);
    }

    bot.position.add(bot.userData.velocity);

    if (onSpeedChange) onSpeedChange(speedRef.current);

    // === Weapons ===
    const nowMs = performance.now();
    if (raceData[id].cannonValue > 0 && nowMs - lastFireTime.current > FIRE_COOLDOWN_MS) {
      fire(id);
      lastFireTime.current = nowMs;
    }

    if (raceData[id].useMine && nowMs - lastMineTime.current > MINE_DROP_COOLDOWN_MS) {
      drop();
      setUseMine(id, false);
      lastMineTime.current = nowMs;
    }
  });
  
  return null;
}
