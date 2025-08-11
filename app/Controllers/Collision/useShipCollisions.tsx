// hooks/useShipCollisions.ts
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { useRef } from 'react';
import { RaceDataType } from '../Game/GameController';

export function useShipCollisions({
  playerRefs,
  onCollide,
  raceData,
  setShieldValue,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[];
  onCollide: (
    a: THREE.Object3D,
    b: THREE.Object3D,
    raceData: RaceDataType,
    setShieldValue: (val: number, id: number) => void,
  ) => void;
  raceData: RaceDataType;
  setShieldValue: (val: number, id: number) => void;
}) {
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const halfSize = new THREE.Vector3();
  const rotation = new THREE.Matrix3();
  const obb = new OBB();

  // Track ongoing collisions to detect 'enter' only
  const activeCollisions = useRef(new Set<string>());

  useFrame(() => {
    const obbs: { ref: THREE.Object3D; obb: OBB }[] = [];

    // Build OBBs
    for (const ref of playerRefs) {
      const object = ref.current;
      if (!object) continue;

      object.updateMatrixWorld();

      box.setFromObject(object);

      box.getCenter(center);
      box.getSize(halfSize).multiplyScalar(0.5);
      rotation.setFromMatrix4(object.matrixWorld);

      obb.center.copy(center);
      obb.halfSize.copy(halfSize);
      obb.rotation.copy(rotation);

      obbs.push({ ref: object, obb });
    }

    const newActive = new Set<string>();

    // Compare all unique pairs
    for (let i = 0; i < obbs.length; i++) {
      for (let j = i + 1; j < obbs.length; j++) {
        const obbA = obbs[i];
        const obbB = obbs[j];

        const idA = obbA.ref.uuid;
        const idB = obbB.ref.uuid;

        // Unique key for the pair (ordered to avoid duplicates like A-B and B-A)
        const pairKey = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;

        if (obbA.obb.intersectsOBB(obbB.obb)) {
          newActive.add(pairKey);

          if (!activeCollisions.current.has(pairKey)) {
            // Collision just started
            // let tempShieldValue = raceData[obbA.ref.userData.id].shieldValue;
            // if (tempShieldValue > 0) {
            //   tempShieldValue -= .2;
            //   setShieldValue(tempShieldValue, obbA.ref.userData.id);
            // }

            // tempShieldValue = raceData[obbB.ref.userData.id].shieldValue;
            // if (tempShieldValue > 0) {
            //   tempShieldValue -= .2;
            //   setShieldValue(tempShieldValue, obbB.ref.userData.id);
            // }
            onCollide(obbA.ref, obbB.ref, raceData, setShieldValue);
          }
        }
      }
    }

    // Update tracked collisions for next frame
    activeCollisions.current = newActive;
  });
}
