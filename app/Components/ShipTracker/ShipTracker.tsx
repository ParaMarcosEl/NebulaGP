import { useShipCollisions } from '@/Controllers/Collision/useShipCollisions';
import { useBotsWorkerController } from '../Player/Bots/useBotsWorkerController';
import { useEffect, useMemo } from 'react';
import { useRaceProgress } from '@/Controllers/Game/RaceProgressController';
import { BotInit, curveType } from '@/Constants';
import * as THREE from 'three';
import { onBulletCollisionWorker, onShipCollisionWorker } from '@/Utils/collisions';
import { useCannon } from '../Weapons/useCannon';
import { useProjectileCollisions } from '@/Controllers/Collision/useProjectileCollisions';
import { ExplosionHandle } from '../Particles/ExplosionParticles/ExplosionParticles';
// import { useProjectileCollisions } from "@/Controllers/Collision/useProjectileCollisions";

export function ShipTracker({
  playerRefs,
  startPositions,
  explosionsRef,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[];
  explosionsRef: React.RefObject<ExplosionHandle>;
  startPositions: {
    position: [number, number, number];
    quaternion: THREE.Quaternion;
  }[];
  curve: curveType;
}) {
  useRaceProgress({ playerRefs: playerRefs as React.RefObject<THREE.Group>[] });
  const botRefToId = useMemo(() => new Map<THREE.Object3D, number>(), []);
  const botRefs = useMemo(() => playerRefs.slice(1), []);

  useEffect(() => {
    botRefs.forEach((ref, i) => {
      if (ref.current) botRefToId.set(ref.current, i + 1);
    });
  }, []);

  // stable botsInit for worker (also created once)
  const botsInit = useMemo<BotInit[]>(
    () =>
      botRefs.map((_, idx) => ({
        id: idx + 1,
        speed: 140 + idx * 10,
        currentT: 0,
        waypointIndex: 8,
        cannonValue: 1,
        useMine: false,
        acceleration: 0.8,
        pitchTorque: -3,
        rollTorque: 10,
        damping: 0.98,
        impulseFade: 0.95,
        position: startPositions[idx + 1].position,
        quaternion: [
          startPositions[idx + 1].quaternion.x,
          startPositions[idx + 1].quaternion.y,
          startPositions[idx + 1].quaternion.z,
          startPositions[idx + 1].quaternion.w,
        ],
      })),
    [],
  );

  // Handlers invoked when worker requests actions:
  const handleBotFire = (botId: number) => {
    // find matching Bot component ref and call its fire method via projectiles hook or route into your weapon system
    // e.g., use a central projectile manager or call into a per-bot weapon hook mapping
    console.debug('bot fire', botId);
    fire(botId);
  };

  const handleBotDropMine = (botId: number) => {
    console.debug('bot dropMine', botId);
    // implement drop mine using minePoolRef
  };

  // attach the global worker controller
  const { triggerImpulseFromMain, setWorkerCannon } = useBotsWorkerController({
    botsInit,
    botRefs: botRefs as React.RefObject<THREE.Group>[],
    onBotFire: handleBotFire,
    onBotDropMine: handleBotDropMine,
  });

  useShipCollisions({
    playerRefs,
    onCollide: (a, b) => {
      onShipCollisionWorker(a, b, triggerImpulseFromMain, botRefToId);
    },
  });

  // Projectiles and mines
  const { fire, poolRef } = useCannon(
    playerRefs as React.RefObject<THREE.Object3D>[],
    setWorkerCannon,
    {
      fireRate: 5,
      maxProjectiles: 20,
      velocity: 400,
    },
  );

  useProjectileCollisions({
    projectiles: poolRef.current,
    playerRefs,
    explosionsRef,
    onCollide: (mesh) => {
      onBulletCollisionWorker(mesh, undefined, undefined, triggerImpulseFromMain, botRefToId);
    },
  });
  return null;
}
