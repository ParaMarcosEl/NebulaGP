'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGhostRecorder } from './useGhostRecorder';
import { useGLTF } from 'node_modules/@react-three/drei';
import { loadGhost } from '@/Utils/ghost';

function useGhostMaterial(model: THREE.Object3D, opacity = 0.2) {
  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
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

export function GhostShip({ trackId }: { trackId: number }) {
  const { scene: sceneModel } = useGLTF("/models/spaceship.glb");
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);
  const ghostRef = useRef<THREE.Group>(null);
  const [ghostInfo, setGhostInfo] = useState<{ time: number; frames: Float32Array } | null>(null);

  useEffect(() => {
    // Safe to call here — only runs in browser
    const ghost = loadGhost(trackId);
    console.log("Loaded ghost", ghost, trackId);
    setGhostInfo(ghost);
  }, [trackId]);

  useGhostMaterial(model, 0.4);

  useGhostRecorder({
    mode: "playback",
    targetRef: ghostRef as React.RefObject<THREE.Object3D>,
    ghostData: ghostInfo?.frames
  });

  return (
    <group ref={ghostRef} >
      <primitive object={model} scale={0.5} rotation={[0, Math.PI, 0]}/>
    </group>
  );
}
