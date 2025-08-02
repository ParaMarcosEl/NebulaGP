// components/Bot/BotCraft.tsx
'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RaceState } from './RaceState';
import { useGLTF } from '@react-three/drei';
import { SHIP_SCALE } from '@/Constants';
import { useGameStore } from '@/Controllers/GameController';

type BotCraftProps = {
  startPosition: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
  curve: THREE.Curve<THREE.Vector3>;
  speed?: number;
};

const BotCraft = forwardRef<THREE.Object3D, BotCraftProps>(
  ({ startPosition, startQuaternion, speed = 0.0005, curve }, ref) => {
    const botRef = useRef<THREE.Group>(null);
    const raceStateRef = useRef<RaceState | null>(null);
    const raceStatus = useGameStore((s) => s.raceStatus);
    const controlsEnabled = raceStatus === 'racing';
    // Load the GLTF model once
    const { scene } = useGLTF('/models/botship.glb');

    // Clone the scene for each instance of BotCraft
    // useMemo ensures this clone happens only when the `scene` object changes
    // (which it won't after the first load, but it's good practice)
    const clonedScene = useMemo(() => scene.clone(true), [scene]);
    // The `true` argument for `clone()` ensures a deep clone, including geometries and materials.

    // Setup initial position & orientation
    useEffect(() => {
      if (botRef.current) {
        botRef.current.position.copy(startPosition);
        botRef.current.quaternion.copy(startQuaternion);
      }
    }, [startPosition, startQuaternion]);

    // Initialize RaceState once
    useEffect(() => {
      if (botRef.current) {
        const raceState = new RaceState(botRef.current, curve, controlsEnabled);
        raceState.speed = speed;
        raceStateRef.current = raceState;
      }
    }, [speed, curve, controlsEnabled]); // Add curve to dependencies if RaceState depends on it

    // Imperative handle for external ref access
    useImperativeHandle(ref, () => botRef.current as THREE.Object3D, []);

    // Frame update for AI movement
    useFrame((_, delta) => {
      if (raceStateRef.current) {
        raceStateRef.current.handleUpdate(delta);
      }
    });

    return (
      <group ref={botRef}>
        <group scale={SHIP_SCALE} rotation={[0, 0, Math.PI / 2]}>
          {/* Use the cloned scene here */}
          <primitive object={clonedScene} scale={0.5} />
        </group>
      </group>
    );
  },
);

BotCraft.displayName = 'BotCraft';
export default BotCraft;
