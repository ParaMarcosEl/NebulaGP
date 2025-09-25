import { create } from 'zustand';
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { CubeTree } from '@/Components/LODTerrain/Planet/CubeTree';
import { useGameStore } from './GameController';

// Extend geometry with BVH properties
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(THREE.Mesh as any).prototype.raycast = acceleratedRaycast;

export function ensureBVH(mesh: THREE.Mesh) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geom = mesh.geometry as any;
  if (!geom.boundsTree) {
    geom.computeBoundsTree();
  } else {
    geom.boundsTree.refit(); // much cheaper than recomputing
  }
}

interface PlanetState {
  
  pendingBuilds: number;
  planetReady: boolean;
  incrementBuilds: () => void;
  decrementBuilds: () => void;
  setPlanetReady: (ready: boolean) => void;
  cubeTreeRef: React.RefObject<CubeTree> | null;
  planetMeshes: THREE.Mesh[];
  setPlanetMeshes: (meshes: THREE.Mesh[]) => void;
  addMesh: (mesh: THREE.Mesh) => void;
  removeMesh: (mesh: THREE.Mesh) => void;
}

export const usePlanetStore = create<PlanetState>((set, get) => ({
  
  pendingBuilds: 0,
  planetReady: false,

  incrementBuilds: () => set((s) => ({ pendingBuilds: s.pendingBuilds + 1 })),
  decrementBuilds: () => {
    const next = get().pendingBuilds - 1;
    set({ pendingBuilds: Math.max(0, next) });

    // ✅ Only mark ready once
    if (next <= 0 && !get().planetReady) {
      set({ planetReady: true });
      useGameStore.getState().setMaterialLoaded(true);
    }
  },
  setPlanetReady: (ready) => set({ planetReady: ready }),
  cubeTreeRef: null,
  planetMeshes: [],
  setPlanetMeshes: (meshes) => set({ planetMeshes: meshes }),
  addMesh: (mesh) => set((state) => ({ planetMeshes: [...state.planetMeshes, mesh] })),
  removeMesh: (mesh) =>
    set((state) => ({
      planetMeshes: state.planetMeshes.filter((m) => m.uuid !== mesh.uuid),
    })),
}));

export async function prepareAndStoreMesh(mesh: THREE.Mesh) {
  if (!mesh.geometry.boundsTree) {
    // Compute BVH before storing
    mesh.geometry.computeBoundsTree();
  }

  usePlanetStore.getState().addMesh(mesh);
}
