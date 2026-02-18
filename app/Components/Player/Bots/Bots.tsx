// Bots.tsx
'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { BotInit, SHIPS, useShips } from '@/Constants';
import { Mine } from '../../Weapons/useMines';
import { ExplosionHandle } from '../../Particles/ExplosionParticles/ExplosionParticles';
import { Bot } from './Bot';
import { useBotsWorkerController } from './useBotsWorkerController';

export type StartPositions = {
  position: THREE.Vector3 | [number, number, number];
  quaternion: THREE.Quaternion;
}[];

type BotsProps = {
  playerRefs: React.RefObject<THREE.Group | null>[]; // first is human player
  minePoolRef: React.RefObject<Mine[]>;
  explosionsRef?: React.RefObject<ExplosionHandle>;
  startPositions: StartPositions;
};

export default function Bots({
  playerRefs,
  startPositions
  //   minePoolRef,
  //   explosionsRef,
}: BotsProps) {
  const shipModels = useShips();

  useEffect(() => {
    console.log('mounting');

    return () => console.log('unmounting');
  }, []);

  // stable botRefs for all bots (created once)
  const botRefs = useMemo(() => playerRefs.slice(1), []);
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
        position: startPositions[idx + 1].position as [number, number, number],
        quaternion: [
          startPositions[idx + 1].quaternion.x,
          startPositions[idx + 1].quaternion.y,
          startPositions[idx + 1].quaternion.z,
          startPositions[idx + 1].quaternion.w,
        ],
      })),
    [],
  );

  useBotsWorkerController({
    botsInit,
    botRefs,
    onBotFire: () => { },
    onBotDropMine: () => { }
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
            id={botId}
            trailTarget={ref as React.RefObject<THREE.Object3D>}
          />
        );
      })}
    </>
  );
}
