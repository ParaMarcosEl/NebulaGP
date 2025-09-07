import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export type PlanetCollisionRef = React.RefObject<THREE.Group | THREE.Object3D>;

export function usePlanetCollisions() {
  const planetRefs = useRef<PlanetCollisionRef[]>([]);

  // Add a planet reference
  const registerPlanet = useCallback((ref: PlanetCollisionRef) => {
    if (ref && !planetRefs.current.includes(ref)) {
      planetRefs.current.push(ref);
    }
  }, []);

  // Remove a planet reference
  const unregisterPlanet = useCallback((ref: PlanetCollisionRef) => {
    planetRefs.current = planetRefs.current.filter((r) => r !== ref);
  }, []);

  // Retrieve all planet refs (for player controllers)
  const getPlanetRefs = useCallback(() => planetRefs.current, []);

  return { registerPlanet, unregisterPlanet, getPlanetRefs, planetRefs };
}
