// Bots.tsx
'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
// import Bot from './Bot';
import { SHIPS, useShips } from '@/Constants';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Mine } from '../../Weapons/useMines';
import { ExplosionHandle } from '../../Particles/ExplosionParticles/ExplosionParticles';
import { Bot } from './Bot';

export type StartPositions = {
  position: THREE.Vector3 | [number, number, number];
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
  //   minePoolRef,
  //   explosionsRef,
}: BotsProps) {
  const { raceData } = useGameStore((s) => s);
  const shipModels = useShips();

  useEffect(() => {
    console.log('mounting');

    return () => console.log('unmounting');
  }, []);

  // stable botRefs for all bots (created once)
  const botRefs = useMemo(() => playerRefs.slice(1), []);
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
