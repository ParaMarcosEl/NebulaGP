'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { usePlayerController } from '@/Controllers/playerControls/PlayerController';
import * as THREE from 'three';
import { SHIP_SCALE } from '@/Constants';
import { RaceState } from './RaceState';
import { useFrame } from '@react-three/fiber';
import { useStateMachine } from '@/Lib/StateMachine/StateMachine';
import { BaseState } from '@/Lib/StateMachine/BaseState';
import { RaceState as FinishedState } from '../Bot/RaceState';
import { useGameStore } from '@/Controllers/GameController';

type AircraftProps = {
  aircraftRef: React.RefObject<THREE.Group | null>;
  obstacleRefs?: React.RefObject<THREE.Mesh | null>[];
  playingFieldRef?: React.RefObject<THREE.Mesh | null>; // <-- Add this optional prop
  acceleration?: number;
  damping?: number;
  onSpeedChange?: (speed: number) => void;
  onAcceleratingChange?: (state: boolean) => void;
  onBrakingChange?: (state: boolean) => void;
  startPosition?: [number, number, number];
  startQuaternion?: THREE.Quaternion;
  curve: THREE.Curve<THREE.Vector3>;
};

export default function Aircraft({
  aircraftRef,
  startPosition,
  startQuaternion,
  obstacleRefs,
  playingFieldRef,
  acceleration,
  damping,
  onSpeedChange,
  onAcceleratingChange,
  onBrakingChange,
  curve,
}: AircraftProps) {
  const { scene } = useGLTF('/models/spaceship.glb');
  const raceStateRef = useRef<RaceState | null>(null);
  const { setState } = useStateMachine(raceStateRef.current as BaseState);
  const { playerPhase } = useGameStore((s) => s);

  useEffect(() => {
    if (aircraftRef.current && startPosition && startQuaternion) {
      aircraftRef.current.position.set(...startPosition);
      aircraftRef.current.quaternion.copy(startQuaternion);
    }
  }, [startPosition, startQuaternion, aircraftRef]);

  // Initialize RaceState once
  useEffect(() => {
    if (aircraftRef.current) {
      const raceState = new RaceState();
      raceStateRef.current = raceState;
    }
  }, [aircraftRef, curve]);

  // Frame update for AI movement
  useFrame((_, delta) => {
    if (raceStateRef.current) {
      raceStateRef.current.handleUpdate(delta);

      if (!aircraftRef.current) return;

      if (playerPhase === 'Finished') setState(new FinishedState(aircraftRef.current, curve, true));
      if (playerPhase === 'Race') setState(new RaceState());
    }
  });

  // Add curve to dependencies if RaceState depends on it
  usePlayerController({
    aircraftRef,
    obstacleRefs,
    playingFieldRef,
    acceleration,
    damping,
    onSpeedChange,
    onAcceleratingChange,
    onBrakingChange,
    curve,
  });

  return (
    <group ref={aircraftRef}>
      <group scale={SHIP_SCALE} rotation={[0, Math.PI, 0]}>
        <primitive object={scene} scale={0.5} />
      </group>
    </group>
  );
}
