'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { curveType } from '@/Constants';
import { PadType, PlayerRef, PadData, usePadControllerBatch } from './usePadControllerBatch';
import { Pad } from './Pad';

type PadSpawnerProps = {
  curve: curveType;
  playerRefs: PlayerRef[];
  padCount?: number;
  startT?: number;
  endT?: number;
  offsetRadius?: number;
  type: PadType;
  meshRefs: React.RefObject<THREE.Mesh>[]; // pass in refs for each pad
};

export default function PadSpawner({
  curve,
  playerRefs,
  padCount = 10,
  startT = 0.1,
  endT = 0.9,
  offsetRadius = 30,
  type,
  meshRefs,
}: PadSpawnerProps) {
  // Generate pad positions only once
  const pads = useMemo(() => {
    const step = (endT - startT) / (padCount - 1);

    return Array.from({ length: padCount }, (_, i) => {
      const t = startT + step * i;
      const position = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();

      const up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.dot(up)) > 0.95) up.set(1, 0, 0);

      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const offsetUp = new THREE.Vector3().crossVectors(side, tangent).normalize();

      const randomAngle = Math.random() * 2 * Math.PI;
      const randomRadius = Math.random() * offsetRadius;
      const offset = new THREE.Vector3()
        .addScaledVector(side, Math.cos(randomAngle) * randomRadius)
        .addScaledVector(offsetUp, Math.sin(randomAngle) * randomRadius);

      const finalPosition = position.clone().add(offset);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tangent,
      );

      return { position: finalPosition, quaternion };
    });
  }, [curve, startT, endT, padCount, offsetRadius]);

  // Link each position to its meshRef
  const padData: PadData[] = useMemo(() => {
    return pads.map((pad, i) => ({
      type,
      meshRef: meshRefs[i],
      cooldownTime: 2,
      didPass: false,
    }));
  }, [pads, type, meshRefs]);

  // Hook handles collision and activation
  usePadControllerBatch(playerRefs, padData);

  return (
    <>
      {pads.map((pad, i) => {
        return (
          <Pad
            key={i}
            type={type}
            meshRef={meshRefs[i]}
            position={pad.position}
            quaternion={pad.quaternion}
            didPass
          />
        );
      })}
    </>
  );
}
