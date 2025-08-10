// hooks/useShipCollisions.ts
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { useRef } from 'react';

export function useShipCollisions({
  playerRefs,
  onCollide,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[],
  onCollide: (a: THREE.Object3D, b: THREE.Object3D) => void,
}) {
  // Track ongoing collisions to detect 'enter' only
  const activeCollisions = useRef(new Set<string>());

  useFrame(() => {
    const obbs: { ref: THREE.Object3D; obb: OBB }[] = [];

    // Build OBBs
    for (const ref of playerRefs) {
      const object = ref.current;
      if (!object) continue;

      object.updateMatrixWorld();

      const box = new THREE.Box3().setFromObject(object);
      const center = new THREE.Vector3();
      const halfSize = new THREE.Vector3();
      const rotation = new THREE.Matrix3();

      box.getCenter(center);
      box.getSize(halfSize).multiplyScalar(0.5);
      rotation.setFromMatrix4(object.matrixWorld);

      const obb = new OBB();
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
            onCollide(obbA.ref, obbB.ref);
          }
        }
      }
    }

    // Update tracked collisions for next frame
    activeCollisions.current = newActive;
  });
}
