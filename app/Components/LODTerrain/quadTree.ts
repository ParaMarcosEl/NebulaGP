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
    const dx = cameraPos.x - this.center.x;
    const dz = cameraPos.z - this.center.y;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const threshold = this.size * thresholdMultiplier;

    return distance < threshold;
  }

  split() {
    const childSize = this.size / 2;
    const quarter = this.size / 4;

    this.children = [
      // SW
      new QuadtreeNode(
        new THREE.Vector2(this.center.x - quarter, this.center.y - quarter),
        childSize,
      ),
      // SE
      new QuadtreeNode(
        new THREE.Vector2(this.center.x + quarter, this.center.y - quarter),
        childSize,
      ),
      // NW
      new QuadtreeNode(
        new THREE.Vector2(this.center.x - quarter, this.center.y + quarter),
        childSize,
      ),
      // NE
      new QuadtreeNode(
        new THREE.Vector2(this.center.x + quarter, this.center.y + quarter),
        childSize,
      ),
    ];
  }

  getLeafNodes(): QuadtreeNode[] {
    if (this.children.length === 0) return [this];
    return this.children.flatMap((child) => child.getLeafNodes());
  }
}

// function snapToGrid(value: number, gridSize: number) {
//   return Math.floor(value / gridSize) * gridSize;
// }
