/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';

// ============================================================================
// BVHVisualizer: Traverses a group to visualize all BVH-enabled meshes.
// ============================================================================
export class BVHVisualizer {
  private wireframeGroup: THREE.Group;
  private material: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.wireframeGroup = new THREE.Group();
    scene.add(this.wireframeGroup);
    this.material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
    });
  }

  /**
   * Visualizes all BVH-enabled meshes inside a group.
   */
  visualizeGroup(group: THREE.Group) {
    this.clear(); // remove old helpers

    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && (obj.geometry as any).boundsTree) {
        this.addBVHBoxes(obj);
      }
    });
  }

  /**
   * Clears the current visualizations.
   */
  clear() {
    this.wireframeGroup.clear();
  }

  private addBVHBoxes(mesh: THREE.Mesh) {
    const geometry: any = mesh.geometry;

    if (!geometry.boundsTree || !geometry.boundsTree.root) return;

    const traverseNode = (node: any) => {
      const box = node.box as THREE.Box3;
      const helper = new THREE.Box3Helper(box);
      const line = new THREE.LineSegments(helper.geometry, this.material);
      this.wireframeGroup.add(line);

      if (!node.isLeaf) {
        if (node.left) traverseNode(node.left);
        if (node.right) traverseNode(node.right);
      }
    };

    traverseNode(geometry.boundsTree.root);
  }
}
