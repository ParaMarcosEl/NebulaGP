// Bots.tsx
'use client';

import React, { useMemo, createRef, useEffect } from 'react';
import * as THREE from 'three';
// import Bot from './Bot';
import { SHIPS, useShips } from '@/Constants';
import { useBotsWorkerController } from './useBotsWorkerController';
import type { BotInit } from '@/Workers/BotWorker.worker';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Mine } from '../Weapons/useMines';
import { ExplosionHandle } from '../Particles/ExplosionParticles/ExplosionParticles';
import { EngineSound } from '../Audio/EngineSound';
import { Shield } from '../Shield/Shield';

export type StartPositions = {
    position: [number, number, number];
    quaternion: THREE.Quaternion;
}[];

type BotsProps = {
    curve: THREE.Curve<THREE.Vector3>;
  playerRefs: React.RefObject<THREE.Group | null>[]; // first is human player
  minePoolRef: React.RefObject<Mine[]>;
  explosionsRef?: React.RefObject<ExplosionHandle>;
  startPositions: StartPositions;
};

export default function Bots({
  // playerRefs,
  startPositions,
//   minePoolRef,
//   explosionsRef,
  curve
}: BotsProps) {
  const { raceData } = useGameStore((s) => s);
  const shipModels = useShips();
  const BOT_COUNT = 7; // adjust to your race size

  useEffect(() => {
    console.log('mounting');

    return () => console.log('unmounting');
  }, []);
  

// stable botRefs for all bots (created once)
const botRefs = useMemo(
  () => Array.from({ length: BOT_COUNT }, () => createRef<THREE.Group | null>()),
  [] // 👈 empty deps → created only once
);

// stable botsInit for worker (also created once)
const botsInit = useMemo<BotInit[]>(
  () =>
    botRefs.map((_, idx) => ({
      id: idx + 1,
      speed: 80,
      currentT: 0,
      waypointIndex: 8,
      cannonValue: 1,
      useMine: false,
      position: startPositions[idx + 1].position,
      quaternion: [
        startPositions[idx + 1].quaternion.x, 
        startPositions[idx + 1].quaternion.y, 
        startPositions[idx + 1].quaternion.z, 
        startPositions[idx + 1].quaternion.w
      ],
    })),
  [] // 👈 no dependencies, created once
);


  // Handlers invoked when worker requests actions:
  const handleBotFire = (botId: number) => {
    // find matching Bot component ref and call its fire method via projectiles hook or route into your weapon system
    // e.g., use a central projectile manager or call into a per-bot weapon hook mapping
    console.debug('bot fire', botId);
    // implement actual fire logic (projectile spawn) here
  };

  const handleBotDropMine = (botId: number) => {
    console.debug('bot dropMine', botId);
    // implement drop mine using minePoolRef
  };
  
  // attach the global worker controller
  useBotsWorkerController({
    botsInit,
    botRefs,
    curve,
    // startPositions,
    onBotFire: handleBotFire,
    onBotDropMine: handleBotDropMine,
  });

  // render Bot components (they may mount and rely on the controller to drive transforms)
  return (
    <>
      {botRefs.map((ref, i) => {
        const botId = i + 1;
        const shipId = (i % 5) + 1;
        const ship = SHIPS[shipId];

        return (
          <group key={botId} ref={ref}>
            <group
              scale={ship.scale}
              rotation={ship.rotation}
              position={ship.offset}
            >
              <primitive object={shipModels[shipId - 1].scene.clone()} scale={0.5} />
              <object3D position={[0, 0.31, 1.8]} />
              <EngineSound volume={1} />
            </group>
            <Shield
              target={ref as React.RefObject<THREE.Object3D>}
              shieldValue={raceData[botId]?.shieldValue ?? 100}
            />
          </group>
        );
      })}
    </>
  );
}
