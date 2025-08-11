'use client';

import { useGLTF, Trail } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SHIP_SCALE } from '@/Constants';
import { useBotController } from './BotController';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Shield } from '../Shield/Shield';

type AircraftProps = {
  id: number;
  aircraftRef: React.RefObject<THREE.Group | null>;
  playerRefs: React.RefObject<THREE.Group | null>[];
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

export default function Bot({
  id,
  playerRefs,
  aircraftRef,
  startPosition,
  startQuaternion,
  curve,
  isBot,
  botSpeed = 1,
}: AircraftProps) {
  const { scene: sceneModel } = useGLTF('/models/spaceship.glb');
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);
  const trailTarget = useRef<THREE.Object3D | null>(null);
  const { raceData } = useGameStore((s) => s);

  useBotController({
    id,
    playerRefs,
    botRef: aircraftRef as React.RefObject<THREE.Group>,
    curve,
    enabled: !!isBot,
    speed: botSpeed,
  });

  useEffect(() => {
    if (aircraftRef.current && startPosition && startQuaternion) {
      aircraftRef.current.position.set(...startPosition);
      aircraftRef.current.quaternion.copy(startQuaternion);
      aircraftRef.current.userData.id = id;
    }
  }, [startPosition, startQuaternion, aircraftRef, id]);

  return (
    <>
      <group ref={aircraftRef}>
        <group scale={SHIP_SCALE} rotation={[0, Math.PI, 0]}>
          <primitive object={model} scale={0.5} />
          <object3D ref={trailTarget} position={[0, 0.31, 1.8]} />
        </group>
      </group>
      <Shield
        target={aircraftRef as React.RefObject<THREE.Object3D>}
        shieldValue={raceData[id].shieldValue}
      />
      <Trail
        target={trailTarget as React.RefObject<THREE.Object3D>}
        width={10}
        length={1}
        color={'orange'}
        decay={0.1}
        attenuation={(t) => t * t}
      />
    </>
  );
}
