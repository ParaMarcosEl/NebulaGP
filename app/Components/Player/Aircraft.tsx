'use client';

import { useGLTF, Trail } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { usePlayerController } from '@/Components/Player/PlayerController';
import * as THREE from 'three';
import { SHIP_SCALE } from '@/Constants';

type AircraftProps = {
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

export default function Aircraft({
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
}: AircraftProps) {
  const { scene: sceneModel } = useGLTF('/models/spaceship.glb');
  const model = useMemo(() => sceneModel.clone(true), [sceneModel]);
  const trailTarget = useRef<THREE.Object3D | null>(null)

  useEffect(() => {
    if (aircraftRef.current && startPosition && startQuaternion) {
      aircraftRef.current.position.set(...startPosition);
      aircraftRef.current.quaternion.copy(startQuaternion);
    }
  }, [startPosition, startQuaternion, aircraftRef]);

  usePlayerController({
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
    enabled: !isBot
  });

  return (
    <>
      <group ref={aircraftRef}>
        <group scale={SHIP_SCALE} rotation={[0, Math.PI, 0]}>
          <primitive object={model} scale={0.5} />
          <object3D ref={trailTarget} position={[0, .31, 2]}/>
        </group>
      </group>
            
      <Trail
        target={trailTarget as React.RefObject<THREE.Object3D>}
        width={10}
        length={.6}
        color={'orange'}
        decay={.001}
        attenuation={(t) => t * t}
      />
    </>
  );
}
