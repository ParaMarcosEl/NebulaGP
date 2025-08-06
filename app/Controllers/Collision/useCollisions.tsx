// hooks/useCollisions.ts
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export type CollisionType = 'box' | 'sphere';

export function useCollisions(
  mesh1: THREE.Object3D | null,
  mesh2: THREE.Object3D | null,
  onCollide: () => void,
  type: CollisionType = 'box',
) {
  useFrame(() => {
    if (!mesh1 || !mesh2) return;

    mesh1.updateMatrixWorld();
    mesh2.updateMatrixWorld();

    if (type === 'box') {
      const box1 = new THREE.Box3().setFromObject(mesh1);
      const box2 = new THREE.Box3().setFromObject(mesh2);

      if (box1.intersectsBox(box2)) {
        onCollide();
      }
    } else if (type === 'sphere') {
      const sphere1 = getBoundingSphere(mesh1);
      const sphere2 = getBoundingSphere(mesh2);

      if (sphere1.intersectsSphere(sphere2)) {
        onCollide();
      }
    }
  });
}

function getBoundingSphere(object: THREE.Object3D): THREE.Sphere {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  return sphere;
}
