import * as THREE from 'three';

export class QuadtreeNode {
  center: THREE.Vector2;
  size: number;
  children: QuadtreeNode[] = [];

  // Cache for leaf nodes (null means cache invalid)
  private leafCache: QuadtreeNode[] | null = null;

  constructor(center: THREE.Vector2, size: number) {
    this.center = center;
    this.size = size;
  }

  shouldSplit(
    cameraPos: THREE.Vector3,
    thresholdMultiplier: number,
    minSize = 1,
    hysteresis = 0.9,
  ) {
    if (this.size <= minSize) return false;

    const dx = cameraPos.x - this.center.x;
    const dz = cameraPos.z - this.center.y;
    const distSq = dx * dx + dz * dz;
    const threshold = this.size * thresholdMultiplier;
    return distSq < threshold * threshold * hysteresis;
  }

  split() {
    if (this.children.length > 0) return; // already split

    const childSize = this.size / 2;
    const quarter = this.size / 4;

    this.children = [
      new QuadtreeNode(
        new THREE.Vector2(this.center.x - quarter, this.center.y - quarter),
        childSize,
      ), // SW
      new QuadtreeNode(
        new THREE.Vector2(this.center.x + quarter, this.center.y - quarter),
        childSize,
      ), // SE
      new QuadtreeNode(
        new THREE.Vector2(this.center.x - quarter, this.center.y + quarter),
        childSize,
      ), // NW
      new QuadtreeNode(
        new THREE.Vector2(this.center.x + quarter, this.center.y + quarter),
        childSize,
      ), // NE
    ];

    this.clearLeafCache();
  }

  mergeIfFar(cameraPos: THREE.Vector3, thresholdMultiplier: number) {
    if (this.children.length === 0) return;

    const allFar = this.children.every(
      (child) => !child.shouldSplit(cameraPos, thresholdMultiplier),
    );
    if (allFar) {
      this.children = [];
      this.clearLeafCache();
    } else {
      for (const child of this.children) {
        child.mergeIfFar(cameraPos, thresholdMultiplier);
      }
    }
  }

  getLeafNodes(): QuadtreeNode[] {
    if (this.leafCache) return this.leafCache;

    if (this.children.length === 0) {
      this.leafCache = [this];
    } else {
      this.leafCache = this.children.flatMap((child) => child.getLeafNodes());
    }
    return this.leafCache;
  }

  private clearLeafCache() {
    this.leafCache = null;
  }

  splitNearCamera(
    cameraPos: THREE.Vector3,
    thresholdMultiplier: number,
    maxDepth: number,
    depth = 0,
  ) {
    if (depth >= maxDepth) return;

    if (this.shouldSplit(cameraPos, thresholdMultiplier)) {
      this.split();
      for (const child of this.children) {
        child.splitNearCamera(cameraPos, thresholdMultiplier, maxDepth, depth + 1);
      }
    }
  }
}
