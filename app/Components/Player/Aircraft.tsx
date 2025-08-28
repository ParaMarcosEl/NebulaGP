'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { usePlayerController } from '@/Components/Player/PlayerController';
import * as THREE from 'three';
import { SHIP_SCALE } from '@/Constants';
import { Shield } from '../Shield/Shield';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Mine } from '../Weapons/useMines';
import { MineExplosionHandle } from '../Particles/ExplosionParticles';

type AircraftProps = {
  id: number;
  trackId: number;
  minePoolRef: React.RefObject<Mine[]>;
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
  explosionPoolRef?: React.RefObject<React.RefObject<MineExplosionHandle>[]>;
};

export default function Aircraft({
  id,
  trackId,
  minePoolRef,
  aircraftRef,
  playerRefs,
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
  explosionPoolRef
}: AircraftProps) {
  const { scene: sceneModel } = useGLTF('/models/spaceship.glb');
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);
  const trailTarget = useRef<THREE.Object3D | null>(null);
  const { raceData } = useGameStore((s) => s);
  
  useEffect(() => {
    console.log({ explosionPoolRef })
  }, [explosionPoolRef])

  useEffect(() => {
    if (aircraftRef.current && startPosition && startQuaternion) {
      aircraftRef.current.position.set(...startPosition);
      aircraftRef.current.quaternion.copy(startQuaternion);
      (aircraftRef.current as THREE.Object3D).userData.id = id;
    }
  }, [startPosition, startQuaternion, aircraftRef, id]);

  usePlayerController({
    id,
    trackId,
    minePoolRef,
    explosionPoolRef,
    aircraftRef,
    playerRefs,
    obstacleRefs,
    playingFieldRef,
    acceleration,
    damping,
    onSpeedChange,
    onAcceleratingChange,
    onBrakingChange,
    curve,
    botSpeed,
    enabled: !isBot,
  });

  return (
    <>
      <group ref={aircraftRef}>
        <group scale={SHIP_SCALE} rotation={[0, Math.PI, 0]}>
          <primitive object={model} scale={0.5} />
          <object3D ref={trailTarget} position={[0, 0.31, 2]} />
          <group rotateY={Math.PI / 2}></group>
        </group>
      </group>
      <Shield
        target={aircraftRef as React.RefObject<THREE.Object3D>}
        shieldValue={raceData[id].shieldValue}
      />
    </>
  );
}
