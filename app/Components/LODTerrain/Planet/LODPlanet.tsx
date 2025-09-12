'use client';

import { useThree } from '@react-three/fiber';
import { CubeTree } from './CubeTree';
import { Vector3, Group } from 'three';
import { useMemo, memo, useRef, useState, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping, LinearFilter } from 'three';
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, MeshBVH } from 'three-mesh-bvh';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';

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
            console.log(`BVH built for ${mesh.name || 'planet mesh'}`);
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
          console.log(`BVH built for ${mesh.name || 'planet mesh'}`);
        }
      }
    });
  }, 0);
}

export function LODPlanet({
  position,
  planetSize = 5,
  cubeSize = 16,
  lowTextPath = '/textures/icy_ground.png',
  midTextPath = '/textures/rocky_ground.png',
  highTextPath = '/textures/molten_rock.png',
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
  const { setPlanetMeshes, setCubeTreeRef } = usePlanetStore((s) => s);
  const cubeTreeRef = useRef<CubeTree>(null);

  useEffect(() => {
    const handleMeshReady = () => {
      (async () => {
        const meshes = await cubeTree.getMeshesForBVH(camera, 1.5);
        window.dispatchEvent(new Event('planet-ready'));
        buildBVHForMeshes(meshes);
      })();
    };
    window.addEventListener('mesh-ready', handleMeshReady);
    return window.removeEventListener('mesh-ready', handleMeshReady);
  }, []);

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
  }, [planetGroup]);

  const [lowTexture, midTexture, highTexture] = useTexture([
    lowTextPath,
    midTextPath,
    highTextPath,
  ]);

  [lowTexture, midTexture, highTexture].forEach((tex) => {
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.minFilter = LinearFilter;
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
    setCubeTreeRef(cubeTreeRef as React.RefObject<CubeTree>);
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
  }, [cubeTree, camera]);

  return (
    <group ref={groupRef} position={position}>
      {planetGroup && <primitive object={planetGroup} />}
    </group>
  );
}

export default memo(LODPlanet);
