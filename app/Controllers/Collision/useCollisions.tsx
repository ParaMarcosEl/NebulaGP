// hooks/useCollisions.ts
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OBB } from 'three/addons/math/OBB.js';

export type CollisionType = 'AABB' | 'SPHERE' | 'OBB';

export function useCollisions({
  mesh1,
  mesh2,
  onCollide,
  type,

}:{
  mesh1: THREE.Object3D | null,
  mesh2: THREE.Object3D | THREE.Object3D[] | null,
  onCollide: (mesh1: THREE.Object3D, mesh2: THREE.Object3D) => void,
  type: CollisionType,
}) {
  const tempBox1 = new THREE.Box3();
  const tempBox2 = new THREE.Box3();

  useFrame(() => {
    if (!mesh1 || !mesh2) return;
    mesh1.updateMatrixWorld();
    if (Array.isArray(mesh2)) {
      mesh2.forEach((mesh) => !!mesh && mesh.updateMatrixWorld());
    } else {
      mesh2.updateMatrixWorld();
    }

    if (type === 'AABB') {
      tempBox1.setFromObject(mesh1);
      if (!Array.isArray(mesh2)) {
        if (mesh1 === mesh2) return;
        tempBox2.setFromObject(mesh2);
  
        if (tempBox1.intersectsBox(tempBox2)) {
          onCollide(mesh1, mesh2);
        }
      } else {
        mesh2.forEach((mesh, i) => {
          tempBox2.setFromObject(mesh);
          if (mesh1 === mesh) return;
          if (tempBox1.intersectsBox(tempBox2)) onCollide(mesh1, mesh2[i]);
        });
      }
    } else if (type === 'SPHERE') {
      const sphere1 = getBoundingSphere(mesh1)[0];
      const spheres = getBoundingSphere(mesh2);
      if (!Array.isArray(mesh2)) {
        if (mesh1 === mesh2) return;
        if (sphere1.intersectsSphere(spheres[0])) {
          onCollide(mesh1, mesh2);
        }
      } else {
        spheres.forEach((sphere, i) => {
          if (mesh1 === mesh2[i]) return;
          if (sphere1.intersectsSphere(sphere)) onCollide(mesh1, mesh2[i]);
        });
      }
    } else if (type === 'OBB') {
      if (!Array.isArray(mesh2)) {
        if (mesh1 === mesh2) return;
        const obb1 = getOBB(mesh1);
        const obb2 = getOBB(mesh2);

        if (obb1.intersectsOBB(obb2)) {
          onCollide(mesh1, mesh2);
        }
      } else {
        mesh2.forEach((mesh) => {
          if (mesh && mesh !== mesh1) {
            const obb1 = getOBB(mesh1);
            const obb2 = getOBB(mesh);

            if (obb1.intersectsOBB(obb2)) {
              onCollide(mesh1, mesh);
            }
          }
        });
      }
    }
  });
}

function getBoundingSphere(object: THREE.Object3D | THREE.Object3D[]): THREE.Sphere[] {
  if (!Array.isArray(object)) {
    const box = new THREE.Box3().setFromObject(object);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    return [sphere];
  } else {
    return object.map((obj) => {
      const box = new THREE.Box3().setFromObject(obj);
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      return sphere;
    });
  }
}


function getOBB(object: THREE.Object3D): OBB {
  const box = new THREE.Box3().setFromObject(object);
  const obb = new OBB();

  // Compute center and half-size
  const center = new THREE.Vector3();
  const halfSize = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(halfSize).multiplyScalar(0.5);

  // Convert rotation part of matrixWorld to Matrix3
  const rotationMatrix = new THREE.Matrix3().setFromMatrix4(object.matrixWorld);

  obb.center.copy(center);
  obb.halfSize.copy(halfSize);
  obb.rotation.copy(rotationMatrix);

  return obb;
}


