'use client';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Pad } from './Pad';
import { usePadControllerBatch, PadType, PadData, PlayerRef } from './usePadControllerBatch';

export type PadTypeData = {
  type: PadType;
  cooldownTime: number;
  padCount: number;
  startT?: number;
  endT?: number;
  offsetRadius?: number;
};

type PadsProps = {
  curve: THREE.Curve<THREE.Vector3>;
  padTypes: PadTypeData[];
  playerRefs: PlayerRef[];
};

export default function Pads({ curve, padTypes, playerRefs }: PadsProps) {
  // --- Stable container for mesh refs
  const allPadRefs = useRef<React.RefObject<THREE.Mesh | null>[]>([]);

  // --- Compute total number of pads
  const totalPadCount = padTypes.reduce((sum, p) => sum + p.padCount, 0);

  // --- Ensure the ref array length matches total pad count
  if (allPadRefs.current.length < totalPadCount) {
    const missing = totalPadCount - allPadRefs.current.length;
    for (let i = 0; i < missing; i++) {
      allPadRefs.current.push(React.createRef<THREE.Mesh>());
    }
  } else if (allPadRefs.current.length > totalPadCount) {
    allPadRefs.current.length = totalPadCount; // trim extras if configuration shrinks
  }

  // --- Expensive geometry and pad data (memoized)
  const { pads, padData } = useMemo(() => {
    const pads: {
      type: PadType;
      meshRef: React.RefObject<THREE.Mesh | null>;
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
    }[] = [];

    const padData: PadData[] = [];

    let padIndex = 0;

    for (const padConfig of padTypes) {
      const {
        type,
        cooldownTime,
        padCount,
        startT = 0.1,
        endT = 0.9,
        offsetRadius = 10,
      } = padConfig;

      // avoid div by zero if padCount == 1
      const step = padCount > 1 ? (endT - startT) / (padCount - 1) : 0;

      for (let i = 0; i < padCount; i++) {
        const t = startT + step * i;
        const position = curve.getPoint(t);
        const tangent = curve.getTangent(t).normalize();

        // Perpendicular basis
        const up =
          Math.abs(tangent.dot(new THREE.Vector3(0, 1, 0))) > 0.95
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0);

        const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const offsetUp = new THREE.Vector3().crossVectors(side, tangent).normalize();

        // Random offset
        const randomAngle = Math.random() * 2 * Math.PI;
        const randomRadius = Math.random() * offsetRadius;
        const offset = new THREE.Vector3()
          .addScaledVector(side, Math.cos(randomAngle) * randomRadius)
          .addScaledVector(offsetUp, Math.sin(randomAngle) * randomRadius);

        const finalPos = position.clone().add(offset);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          tangent,
        );

        const meshRef = allPadRefs.current[padIndex];

        pads.push({
          type,
          meshRef,
          position: finalPos,
          quaternion,
        });

        padData.push({
          type,
          meshRef: meshRef as React.RefObject<THREE.Mesh>,
          cooldownTime,
          didPass: false,
        });

        padIndex++;
      }
    }

    return { pads, padData };
  }, [curve, padTypes]);

  // --- Hook up controller
  usePadControllerBatch(playerRefs, padData);

  // --- Render pads
  return (
    <>
      {pads.map((pad, i) => (
        <Pad
          key={`${pad.type}-${i}`}
          type={pad.type}
          meshRef={pad.meshRef as React.RefObject<THREE.Mesh>}
          position={pad.position}
          quaternion={pad.quaternion}
          didPass={padData[i].didPass}
        />
      ))}
    </>
  );
}
