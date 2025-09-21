'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { usePlayerController } from '@/Components/Player/PlayerController';
import * as THREE from 'three';
import { SHIPS } from '@/Constants';
import { Shield } from '../Shield/Shield';
import { useGameStore } from '@/Controllers/Game/GameController';
import { Mine } from '../Weapons/useMines';
import { EngineSound } from '../Audio/EngineSound';
import { ExplosionHandle } from '../Particles/ExplosionParticles/ExplosionParticles';

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
  explosionsRef?: React.RefObject<ExplosionHandle>;
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
  explosionsRef,
}: AircraftProps) {
  const ship = useMemo(() => {
    return SHIPS[`ship0${1}`];
  }, []);
  const { scene: sceneModel } = useGLTF(ship.path);
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);
  const trailTarget = useRef<THREE.Object3D | null>(null);
  const { raceData } = useGameStore((s) => s);

  useEffect(() => {
    console.log({ explosionsRef });
  }, [explosionsRef]);

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
    explosionsRef,
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
        <group scale={ship.scale} rotation={ship.rotation} position={ship.offset}>
          <primitive object={model} scale={0.5} />
          <object3D ref={trailTarget} position={[0, 0.31, 2]} />
          <EngineSound volume={1} />
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
