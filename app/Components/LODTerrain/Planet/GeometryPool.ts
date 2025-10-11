import * as THREE from 'three';

interface GeometryPoolEntry {
  geometry: THREE.BufferGeometry;
  inUse: boolean;
  segmentCount: number;
}

class GeometryPool {
  private pool: GeometryPoolEntry[] = [];

  getGeometry(segmentCount: number): THREE.BufferGeometry {
    const free = this.pool.find((g) => !g.inUse && g.segmentCount === segmentCount);
    if (free) {
      free.inUse = true;
      return free.geometry;
    }

    const geometry = new THREE.BufferGeometry(); // attributes filled later
    this.pool.push({ geometry, inUse: true, segmentCount });
    return geometry;
  }

  releaseGeometry(geometry: THREE.BufferGeometry) {
    const entry = this.pool.find((g) => g.geometry === geometry);
    if (entry) entry.inUse = false;
  }

  clearUnused() {
    this.pool = this.pool.filter((g) => g.inUse);
  }
}

export const geometryPool = new GeometryPool();
