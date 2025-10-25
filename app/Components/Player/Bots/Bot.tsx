import { EngineSound } from '@/Components/Audio/EngineSound';
import { Shield } from '@/Components/Shield/Shield';
import { shipType } from '@/Constants';
import { RaceDataType } from '@/Controllers/Game/GameController';
import * as THREE from 'three';

export const Bot = ({
  aircraftRef,
  ship,
  model,
  trailTarget,
  raceData,
  id,
}: {
  aircraftRef: React.RefObject<THREE.Group>;
  ship: shipType;
  model: THREE.Group;
  trailTarget: React.RefObject<THREE.Object3D>;
  raceData: RaceDataType;
  id: number;
}) => {
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
};
