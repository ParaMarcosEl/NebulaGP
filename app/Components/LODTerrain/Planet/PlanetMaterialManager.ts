import { PlanetMaterial } from './PlanetMaterial';
import * as THREE from 'three';

type MaterialKey = string;

class PlanetMaterialManager {
  private cache = new Map<MaterialKey, PlanetMaterial>();

  getMaterial(lowTex: THREE.Texture, midTex: THREE.Texture, highTex: THREE.Texture) {
    const key = [lowTex.uuid, midTex.uuid, highTex.uuid].join(':');
    if (!this.cache.has(key)) {
      const mat = new PlanetMaterial(lowTex, midTex, highTex);
      this.cache.set(key, mat);
    }
    return this.cache.get(key)!;
  }

  disposeAll() {
    for (const mat of this.cache.values()) mat.dispose();
    this.cache.clear();
  }
}

export const planetMaterialManager = new PlanetMaterialManager();

let instance: PlanetMaterialManager | null = null;

export function getPlanetMaterialManager() {
  if (!instance) instance = new PlanetMaterialManager();
  return instance;
}

