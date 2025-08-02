import React, { useMemo } from 'react';
import * as THREE from 'three';
import { curveType } from '@/Constants';
import SpeedPad from './SpeedPad';

type SpeedPadSpawnerProps = {
  curve: curveType;
  playerRefs: { id: number; ref: React.RefObject<THREE.Object3D> }[];
  padCount?: number;
  startT?: number;
  endT?: number;
};

export default function SpeedPadSpawner({
  curve,
  playerRefs,
  padCount = 10,
  startT = 0.1,
  endT = 0.9,
}: SpeedPadSpawnerProps) {
  const pads = useMemo(() => {
    const step = (endT - startT) / (padCount - 1);

    return Array.from({ length: padCount }, (_, i) => {
      const t = startT + step * i;
      const position = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      );

      return { position, quaternion };
    });
  }, [curve, startT, endT, padCount]);

  return (
    <>
      {pads.map((pad, index) => (
        <SpeedPad
          key={index}
          position={pad.position}
          quaternion={pad.quaternion}
          playerRefs={playerRefs}
        />
      ))}
    </>
  );
}
