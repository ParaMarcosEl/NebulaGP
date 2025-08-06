'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { usePlayerController } from '@/Components/Player/PlayerController';
import * as THREE from 'three';
import { SHIP_SCALE, TOTAL_LAPS } from '@/Constants';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useBotController } from './BotController';

type AircraftProps = {
  aircraftRef: React.RefObject<THREE.Group | null>;
  obstacleRefs?: React.RefObject<THREE.Mesh | null>[];
  playingFieldRef?: React.RefObject<THREE.Mesh | null>;
  acceleration?: number;
  damping?: number;
  onSpeedChange?: (speed: number) => void;
  onAcceleratingChange?: (state: boolean) => void;
  onBrakingChange?: (state: boolean) => void;
  startPosition?: [number, number, number];
  startQuaternion?: THREE.Quaternion;
  curve: THREE.Curve<THREE.Vector3>;
  isBot?: boolean;
  botSpeed?: number;
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
  isBot,
  botSpeed = 1,
}: AircraftProps) {
  const { scene: sceneModel } = useGLTF('/models/spaceship.glb');
  const { raceData, playerId } = useGameStore((s) => s);
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);

  useEffect(() => {
    if (aircraftRef.current && startPosition && startQuaternion) {
      aircraftRef.current.position.set(...startPosition);
      aircraftRef.current.quaternion.copy(startQuaternion);
    }
  }, [startPosition, startQuaternion, aircraftRef]);

  useBotController({
    botRef: aircraftRef as React.RefObject<THREE.Group>,
    curve,
    enabled: isBot || raceData[playerId]?.history?.length >= TOTAL_LAPS,
    speed: botSpeed,
  });

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
    botSpeed,
  });

  return (
    <>
      <group ref={aircraftRef}>
        <group scale={SHIP_SCALE} rotation={[0, Math.PI, 0]}>
          <primitive object={model} scale={0.5} />
        </group>
      </group>
    </>
  );
}
