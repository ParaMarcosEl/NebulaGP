'use client';

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
  offsetRadius?: number; // how far pads can randomly be from the curve
};

export default function SpeedPadSpawner({
  curve,
  playerRefs,
  padCount = 10,
  startT = 0.1,
  endT = 0.9,
  offsetRadius = 30, // how far pads can randomly be from the curve
}: SpeedPadSpawnerProps) {
  const pads = useMemo(() => {
    const step = (endT - startT) / (padCount - 1);

    return Array.from({ length: padCount }, (_, i) => {
      const t = startT + step * i;
      const position = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();

      // Create two perpendicular vectors to the tangent
      const up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.dot(up)) > 0.95) up.set(1, 0, 0); // avoid degeneracy

      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const offsetUp = new THREE.Vector3().crossVectors(side, tangent).normalize();

      // Apply random offset
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
  }, [endT, startT, padCount, curve, offsetRadius]);

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
