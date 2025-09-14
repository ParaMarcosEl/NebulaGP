'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SHIPS } from '@/Constants';
import { useBotController } from './BotController';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Shield } from '../Shield/Shield';
import { Mine } from '../Weapons/useMines';
import { MineExplosionHandle } from '../Particles/ExplosionParticles';
import { EngineSound } from '../Audio/EngineSound';

type AircraftProps = {
  id: number;
  aircraftRef: React.RefObject<THREE.Group | null>;
  minePoolRef: React.RefObject<Mine[]>;
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
  explosionPoolRef?: React.RefObject<React.RefObject<MineExplosionHandle>[]>;
};

export default function Bot({
  id,
  playerRefs,
  minePoolRef,
  aircraftRef,
  startPosition,
  startQuaternion,
  curve,
  isBot,
  botSpeed = 1,
  explosionPoolRef,
}: AircraftProps) {
  const ship = useMemo(() => {
    const randomNumber = Math.floor(Math.random() * 5) + 1;
    return SHIPS[`ship0${randomNumber}`];
  }, []);

  const { scene: sceneModel } = useGLTF(ship.path);
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);
  const trailTarget = useRef<THREE.Object3D | null>(null);
  const { raceData } = useGameStore((s) => s);

  

  useBotController({
    id,
    playerRefs,
    minePoolRef,
    botRef: aircraftRef as React.RefObject<THREE.Group>,
    curve,
    enabled: !!isBot,
    speed: botSpeed,
    explosionPoolRef,
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
        <group scale={ship.scale} rotation={ship.rotation} position={ship.offset}>
          <primitive object={model} scale={0.5} />
          <object3D ref={trailTarget} position={[0, 0.31, 1.8]} />
          <EngineSound volume={1} />
        </group>
      </group>
      <Shield
        target={aircraftRef as React.RefObject<THREE.Object3D>}
        shieldValue={raceData[id].shieldValue}
      />
    </>
  );
}
