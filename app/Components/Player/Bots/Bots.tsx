// Bots.tsx
'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
// import Bot from './Bot';
import { SHIPS, useShips } from '@/Constants';
import { useBotsWorkerController } from './useBotsWorkerController';
import { BotInit } from '@/Constants';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Mine } from '../../Weapons/useMines';
import { ExplosionHandle } from '../../Particles/ExplosionParticles/ExplosionParticles';
import { Bot } from './Bot';

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
  playerRefs,
  startPositions,
//   minePoolRef,
//   explosionsRef,
  curve
}: BotsProps) {
  const { raceData } = useGameStore((s) => s);
  const shipModels = useShips();

  useEffect(() => {
    console.log('mounting');

    return () => console.log('unmounting');
  }, []);
  

// stable botRefs for all bots (created once)
const botRefs = useMemo(
  () => playerRefs.slice(1),
  [] 
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
  [] 
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
  const { triggerImpulseFromMain } = useBotsWorkerController({
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
          <Bot 
            key={i}
            aircraftRef={ref as React.RefObject<THREE.Group>} 
            ship={ship}
            model={shipModels[shipId - 1].scene.clone()}
            raceData={raceData}
            id={botId}
            trailTarget={ref as React.RefObject<THREE.Object3D>}
          />
        );
      })}
    </>
  );
}
