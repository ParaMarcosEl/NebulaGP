'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useState } from 'react';
import { useGhostRecorder } from './useGhostRecorder';
import { useGLTF } from 'node_modules/@react-three/drei';
import { loadGhost } from '@/Utils/ghost';

function useGhostMaterial(model: THREE.Object3D, opacity = 0.4) {
  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.Material) {
            mat.transparent = true;
            mat.opacity = opacity;
            mat.depthWrite = false; // prevents weird transparency sorting
          }
        });
      }
    });
  }, [model, opacity]);
}

export function GhostShip({
  shipRef,
  trackId,
}: {
  shipRef: React.RefObject<THREE.Object3D>;
  trackId: number;
}) {
  const { scene: sceneModel } = useGLTF('/models/ghostship.glb');
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);
  const [ghostInfo, setGhostInfo] = useState<{ time: number; frames: Float32Array } | null>(null);

  useEffect(() => {
    // Safe to call here — only runs in browser
    const ghost = loadGhost(trackId);
    setGhostInfo(ghost);
  }, [trackId]);

  useGhostMaterial(model, 0.4);

  useGhostRecorder({
    mode: 'playback',
    targetRef: shipRef as React.RefObject<THREE.Object3D>,
    ghostData: ghostInfo?.frames,
  });

  return (
    <group ref={shipRef}>
      <primitive object={model} scale={0.5} rotation={[0, Math.PI, 0]} />
    </group>
  );
}
