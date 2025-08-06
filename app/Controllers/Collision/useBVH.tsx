// hooks/useCollisions.ts
import { useEffect } from 'react';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

/**
 * Performs collision detection between two meshes using BVH.
 * @param mesh1 - First mesh to test (e.g. ship)
 * @param mesh2 - Second mesh to test (e.g. obstacle)
 * @param onCollide - Callback invoked when collision is detected
 */
export function useBVH(mesh1: THREE.Mesh | null, mesh2: THREE.Mesh | null, onCollide: () => void) {
  useEffect(() => {
    if (!mesh1 || !mesh2) return;

    const geom1 = mesh1.geometry;
    const geom2 = mesh2.geometry;

    if (!geom1.boundsTree) geom1.computeBoundsTree?.();
    if (!geom2.boundsTree) geom2.computeBoundsTree?.();

    const tempMatrix1 = new THREE.Matrix4();
    const tempMatrix2 = new THREE.Matrix4();

    const bvh1 = geom1.boundsTree as MeshBVH;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const bvh2 = geom2.boundsTree as MeshBVH;

    const box1 = new THREE.Box3();
    const box2 = new THREE.Box3();

    const checkCollision = () => {
      mesh1.updateMatrixWorld();
      mesh2.updateMatrixWorld();

      tempMatrix1.copy(mesh1.matrixWorld);
      tempMatrix2.copy(mesh2.matrixWorld);

      box1.setFromObject(mesh1);
      box2.setFromObject(mesh2);

      if (!box1.intersectsBox(box2)) return;

      // Use the default intersectsGeometry signature; transform geometry if needed before calling
      const hit = bvh1.intersectsGeometry(geom2, tempMatrix2);

      if (hit) {
        onCollide();
      }
    };

    const id = requestAnimationFrame(function loop() {
      checkCollision();
      requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(id);
  }, [mesh1, mesh2, onCollide]);
}
