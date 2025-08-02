'use client';

import { useEffect, useState } from 'react';
import MiniMapSvg from './MiniMapSVG';
import * as THREE from 'three';

type Props = {
  curve: THREE.Curve<THREE.Vector3>;
  positions: { id: number; isPlayer: boolean; v: THREE.Vector3 }[];
};

export function MiniMapWrapper({ curve, positions }: Props) {
  const playerPositions = positions.filter((pos) => pos.v instanceof THREE.Vector3);
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
