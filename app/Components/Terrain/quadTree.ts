import * as THREE from 'three';

export class QuadtreeNode {
  center: THREE.Vector2;
  size: number;
  children: QuadtreeNode[] = [];

  constructor(center: THREE.Vector2, size: number) {
    this.center = center;
    this.size = size;
  }

  shouldSplit(cameraPos: THREE.Vector3, thresholdMultiplier: number) {
    const distance = cameraPos
      .clone()
      .setY(0)
      .distanceTo(new THREE.Vector3(this.center.x, 0, this.center.y));
    return distance < this.size * thresholdMultiplier;
  }

  split() {
    const half = this.size / 2;
    const offsets = [
      new THREE.Vector2(half, half),
      new THREE.Vector2(-half, half),
      new THREE.Vector2(half, -half),
      new THREE.Vector2(-half, -half),
    ];

    this.children = offsets.map(
      (offset) => new QuadtreeNode(this.center.clone().add(offset), half),
    );
  }

  getLeafNodes(): QuadtreeNode[] {
    if (this.children.length === 0) return [this];
    return this.children.flatMap((child) => child.getLeafNodes());
  }
}
