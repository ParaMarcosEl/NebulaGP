'use client';

import { useThree } from '@react-three/fiber';
import { CubeTree } from './CubeTree';
import { Vector3, Group } from 'three';
import { useMemo, memo, useRef, useState, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, MeshBVH } from 'three-mesh-bvh';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';
import { useGameStore } from '@/Controllers/Game/GameController';

type PlanetProps = {
  position?: Vector3 | [number, number, number];
  planetSize?: number;
  cubeSize?: number;
  lowTextPath?: string;
  midTextPath?: string;
  highTextPath?: string;
  maxHeight?: number;
  frequency?: number;
  amplitude?: number;
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
  exponentiation?: number;
  animate?: boolean;
  onReady?: () => void;
};

function collectBVHMeshes(obj: THREE.Object3D, out: THREE.Mesh[]) {
  if ((obj as THREE.Mesh).isMesh) {
    const mesh = obj as THREE.Mesh;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geom = mesh.geometry as any;
    if (
      geom?.boundsTree instanceof MeshBVH && // BVH check
      mesh.userData?.isPlanet // optional tag check
    ) {
      out.push(mesh);
    }
  }

  for (const child of obj.children) {
    collectBVHMeshes(child, out);
  }
}

export function buildBVHForMeshes(root: THREE.Object3D | THREE.Object3D[]) {
  setTimeout(() => {
    if (Array.isArray(root)) {
      root.forEach((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const geom = mesh.geometry as THREE.BufferGeometry;

          if (!geom.boundsTree) {
            // Attach BVH to this mesh
            geom.computeBoundsTree = computeBoundsTree;
            geom.disposeBoundsTree = disposeBoundsTree;
            geom.computeBoundsTree();

            mesh.userData.isPlanet = true;
            mesh.userData.hasBVH = true;
          }
        }
      });
      return;
    }
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const geom = mesh.geometry as THREE.BufferGeometry;

        if (!geom.boundsTree) {
          // Attach BVH to this mesh
          geom.computeBoundsTree = computeBoundsTree;
          geom.disposeBoundsTree = disposeBoundsTree;
          geom.computeBoundsTree();

          mesh.userData.isPlanet = true;
          mesh.userData.hasBVH = true;
        }
      }
    });
  }, 0);
}

export function LODPlanet({
  position,
  planetSize = 5,
  cubeSize = 16,
  lowTextPath = '/textures/icy_ground128.png',
  midTextPath = '/textures/rocky_ground128.png',
  highTextPath = '/textures/molten_rock128.png',
  maxHeight = 300,
  frequency = 20,
  amplitude = 0.5,
  octaves = 2,
  lacunarity = 3.0,
  persistence = 0.5,
  exponentiation = 2,
}: PlanetProps) {
  const timeRef = useRef(0);
  const { camera } = useThree();
  const [planetGroup, setPlanetGroup] = useState<Group | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { setPlanetMeshes } = usePlanetStore((s) => s);
  const cubeTreeRef = useRef<CubeTree>(null);

  useEffect(() => {
    if (!planetGroup) return;

    // Build BVH once planetGroup is ready
    buildBVHForMeshes(planetGroup);

    // Optionally update global store with BVH meshes
    const collected: THREE.Mesh[] = [];
    collectBVHMeshes(planetGroup, collected);
    setPlanetMeshes(collected);

    // Fire event now that BVH is ready
    window.dispatchEvent(new Event('planet-bvh-ready'));

    return () => useGameStore.getState().setMaterialLoaded(false);
  }, [planetGroup]);

  const [lowTexture, midTexture, highTexture] = useTexture([
    lowTextPath,
    midTextPath,
    highTextPath,
  ]);

  [lowTexture, midTexture, highTexture].forEach((tex) => {
    tex.minFilter = THREE.LinearMipMapLinearFilter; // enable mipmaps
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  });

  // Memoize CubeTree
  const cubeTree = useMemo(() => {
    const cubeTree = new CubeTree(planetSize, cubeSize, lowTexture, midTexture, highTexture, {
      uMaxHeight: maxHeight,
      uFrequency: frequency,
      uAmplitude: amplitude,
      uOctaves: octaves,
      uLacunarity: lacunarity,
      uPersistence: persistence,
      uExponentiation: exponentiation,
      uTime: timeRef.current,
    });
    cubeTreeRef.current = cubeTree;
    return cubeTree;
  }, [
    planetSize,
    cubeSize,
    lowTexture,
    midTexture,
    highTexture,
    maxHeight,
    frequency,
    amplitude,
    octaves,
    lacunarity,
    persistence,
    exponentiation,
  ]);

  // Async update
  useEffect(() => {
    if (!lowTexture || !midTexture || !highTexture) return;
    let mounted = true;
    (async () => {
      const group = await cubeTree.getDynamicMeshesAsync(camera, 1.5);
      window.dispatchEvent(new Event('planet-ready'));
      buildBVHForMeshes(group);

      if (mounted) setPlanetGroup(group);
    })();
    return () => {
      mounted = false;
    };
  }, [cubeTree, camera, lowTexture, midTexture, highTexture]);

  return (
    <group ref={groupRef} position={position}>
      {planetGroup && <primitive object={planetGroup} />}
    </group>
  );
}

export default memo(LODPlanet);
