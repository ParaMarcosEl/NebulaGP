'use client';

import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { curveType } from '@/Constants';
import ShieldPad from './ShieldPad';

type ShieldPadSpawnerProps = {
  curve: curveType;
  playerRefs: { id: number; ref: React.RefObject<THREE.Object3D> }[];
  padCount?: number;
  startT?: number;
  endT?: number;
  offsetRadius?: number;
};

export default function ShieldPadSpawner({
  curve,
  playerRefs,
  padCount = 10,
  startT = 0.1,
  endT = 0.9,
  offsetRadius = 30,
}: ShieldPadSpawnerProps) {
  const [pads] = useState(() => {
    const step = (endT - startT) / (padCount - 1);
    const padArray: { position: THREE.Vector3; quaternion: THREE.Quaternion }[] = [];

    for (let i = 0; i < padCount; i++) {
      const t = startT + step * i;
      const position = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();

      const up = Math.abs(tangent.dot(new THREE.Vector3(0, 1, 0))) > 0.95
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);

      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const offsetUp = new THREE.Vector3().crossVectors(side, tangent).normalize();

      const randomAngle = Math.random() * 2 * Math.PI;
      const randomRadius = Math.random() * offsetRadius;
      const offset = new THREE.Vector3()
        .addScaledVector(side, Math.cos(randomAngle) * randomRadius)
        .addScaledVector(offsetUp, Math.sin(randomAngle) * randomRadius);

      padArray.push({
        position: position.clone().add(offset),
        quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent),
      });
    }

    return padArray;
  });

  useEffect(() => {
    console.log('ShieldPads mounted');
    return () => console.log('ShieldPads unmounted');
  }, []);

  return (
    <>
      {pads.map((pad, index) => (
        <ShieldPad key={index} position={pad.position} quaternion={pad.quaternion} playerRefs={playerRefs} />
      ))}
    </>
  );
}
