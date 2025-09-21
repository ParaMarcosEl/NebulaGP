'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ReactElement, useEffect, useImperativeHandle, useRef, useState } from 'react';
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

export function useBotController({
  id,
  botRef,
  playerRefs,
  minePoolRef,
  curve,
  speed = 0.05,
  maxSpeed = 2,
  acceleration = 0.2,
  enabled = true,
  onSpeedChange,
  explosionsRef,
}: UseBotControllerProps) {
  const currentTRef = useRef(0);
  const [waypoints, setWaypoints] = useState<THREE.Vector3[]>([]);
  const [waypointMeshes, setWaypointMeshes] = useState<ReactElement[]>([]);
  const speedRef = useRef(0);
  const time = useRef(0);
  const t = useRef(0);
  const waypointIndexRef = useRef(8);
  const { raceStatus, raceData, setUseMine } = useGameStore((s) => s);
  const forward = new THREE.Vector3(0, 0, -1);
  const up = new THREE.Vector3(0, 1, 0);
  const deltaQuat = new THREE.Quaternion();

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

  useEffect(() => {
    const bot = botRef.current;
    if (bot && !bot.userData.impulseVelocity) {
      bot.userData.impulseVelocity = new THREE.Vector3();
    }
  }, [botRef]);

  useImperativeHandle(botRef, () => botRef.current as THREE.Group, [botRef]);
  useFrame((_, delta) => {
    const bot = botRef.current;
    if (!bot || !enabled || raceStatus !== 'racing') return;

    time.current += delta;
    const nearestT = getNearestCurveT(bot.position, curve);
    const curvePosition = curve.getPointAt(nearestT);
    bot.userData.curvePosition = curvePosition.clone();
    bot.userData.progress = nearestT;

    // Imperative handle for external ref access

    // Initialize waypoints
    if (waypoints.length === 0) {
      const nearestT = getNearestCurveT(bot.position, curve);
      const path = getWaypointsAlongCurve(curve, 0.01, 0.99, 0.01);
      setWaypoints(path);
      currentTRef.current = nearestT;

      const meshes = path.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={index === 0 ? 'green' : 'red'} opacity={0} />
        </mesh>
      ));
      setWaypointMeshes(meshes);
      return;
    }

    // Update visual meshes with current target indicator
    const newMeshes = waypoints.map((point, index) => (
      <mesh key={index} position={point}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={index === waypointIndexRef.current ? 'green' : 'red'}
          opacity={0}
        />
      </mesh>
    ));
    setWaypointMeshes(newMeshes);

    // === Movement Logic ===
    let currentWaypoint = waypoints[waypointIndexRef.current];
    let toWaypoint = currentWaypoint.clone().sub(bot.position);
    let distance = toWaypoint.length();

    if (distance < 50 && waypointIndexRef.current < waypoints.length) {
      waypointIndexRef.current++;
    }
    if (waypointIndexRef.current === waypointMeshes.length) {
      waypointIndexRef.current = 0;
      currentWaypoint = waypoints[0];
      toWaypoint = currentWaypoint.clone().sub(bot.position);
      distance = toWaypoint.length();
    }

    // === Orientation ===
    const desiredDirection = toWaypoint.normalize();
    const accelerationVector = desiredDirection.multiplyScalar(acceleration);

    forward.applyQuaternion(bot.quaternion);
    up.applyQuaternion(bot.quaternion);
    const angle = forward.angleTo(toWaypoint.clone().normalize());

    const pitch = computePitchInput(forward, toWaypoint, up) * PITCH_TORQUE;
    const roll = computeRollInput(forward, toWaypoint, up) * ROLL_TORQUE;

    speedRef.current = angle < 0.4 ? speed : speed * 0.5;
    const offCourse = angle > 1.0;

    if (offCourse) {
      //dampen acceleration
      speedRef.current = speedRef.current * 0.5;
    }
    // Construct a new rotation delta using pitch (x) and roll (z)
    const rotationEuler = new THREE.Euler(
      pitch * delta, // X-axis (pitch)
      0, // Yaw could be added if needed
      roll * delta, // Z-axis (roll)
      'XYZ',
    );

    deltaQuat.setFromEuler(rotationEuler);
    bot.quaternion.multiply(deltaQuat).normalize();

    // === Translation ===
    bot.userData.velocity = forward.multiplyScalar(speedRef.current);
    // Calculate forward direction based on ship's current rotation.
    // Calculate desired velocity based on forward direction and speed.

    // const desiredVelocity = forward.multiplyScalar(speedRef.current);
    // // Lerp (linear interpolate) the current velocity towards the desired velocity for smooth movement.
    // const lerpFactor = Math.max(0.05, Math.min(1, Math.abs(speedRef.current)));
    // bot.userData.velocity.lerp(desiredVelocity, lerpFactor);
    // // Update ship position based on current velocity.
    // bot.position.add(bot.userData.velocity);
    const desiredVelocity = forward.multiplyScalar(speedRef.current);
    const lerpFactor = Math.max(0.05, Math.min(1, Math.abs(speedRef.current)));
    bot.userData.velocity.lerp(desiredVelocity, lerpFactor);

    // Update velocity by adding the acceleration

    // Apply impulse velocity and decay
    bot.userData.velocity.add(bot.userData.impulseVelocity);

    // Apply decay to impulse
    bot.userData.impulseVelocity.multiplyScalar(0.9); // Tune this for bounce recovery

    bot.userData.velocity.add(accelerationVector);

    // Clamp the velocity to the max speed
    if (bot.userData.velocity.length() > maxSpeed) {
      bot.userData.velocity.normalize().multiplyScalar(maxSpeed);
    }

    bot.position.add(bot.userData.velocity);

    if (onSpeedChange) onSpeedChange(speedRef.current);
    if (raceData[id].cannonValue > 0) {
      fire(id);
    }
    if (raceData[id].useMine) {
      setTimeout(() => {
        drop();
        setUseMine(id, false);
      }, 1500);
    }
  });

  return { waypointMeshes };
}
