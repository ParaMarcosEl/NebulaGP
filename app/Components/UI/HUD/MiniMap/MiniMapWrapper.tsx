'use client';

import { useEffect, useMemo, useState } from 'react';
import MiniMapSvg from './MiniMapSVG';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useThrottledValue } from '@/stages/stage1/page';

export function MiniMapWrapper() {
  const raceData = useGameStore((s) => s.raceData);
  const curve = useGameStore((s) => s.track);
  // compute positions but throttle them to e.g. 12 fps to avoid React churn
  const positions = useMemo(() => {
    return Object.entries(raceData)
      .map(([id, player]) => ({ isPlayer: player.isPlayer, v: player.position, id: parseInt(id) }))
      .filter((p) => p.id >= 0);
  }, [raceData]);

  const throttledPositions = useThrottledValue(positions, 12);
  const playerPositions = throttledPositions.filter((pos) => pos.v instanceof THREE.Vector3);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  return (
    <MiniMapSvg
      curve={curve}
      positions={playerPositions}
      svgWidth={150}
      svgHeight={150}
      strokeColor="cyan"
      backgroundColor="rgba(0,0,0,0)"
    />
  );
}
