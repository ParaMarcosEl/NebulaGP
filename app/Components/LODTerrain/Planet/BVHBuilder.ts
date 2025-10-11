import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import * as THREE from 'three';

// Ensure patching is applied once globally
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export async function buildBVHAsync(mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.BufferGeometry;

  if (!geometry || geometry.boundsTree) return;

  return new Promise<void>((resolve) => {
    // Use setTimeout to yield control back to main thread between heavy tasks
    setTimeout(() => {
      try {
        geometry.computeBoundsTree(); // or defaults
        mesh.userData.bvhBuilt = true;
      } catch (err) {
        console.warn('BVH build failed:', err);
      }
      resolve();
    }, 0);
  });
}
