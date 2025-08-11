// controllers/CheckpointController.ts
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

type Checkpoint = {
  mesh: THREE.Mesh;
  didPass: boolean;
};

export function useCheckpointController({
  aircraftRef,
  checkpointMeshRef,
  cooldownTime = 2,
}: {
  aircraftRef: React.RefObject<THREE.Object3D>;
  checkpointMeshRef: React.RefObject<THREE.Mesh>;
  cooldownTime?: number;
}) {
  const checkpoint = useRef<Checkpoint>({
    mesh: checkpointMeshRef.current as THREE.Mesh,
    didPass: false,
  });
  const aircraftBox = new THREE.Box3();
  const checkpointBox = new THREE.Box3();
  const cooldown = useRef(0);
  // const clock = new THREE.Clock(); // Clock for delta time calculation

  useFrame((_, delta) => {
    const aircraft = aircraftRef.current;
    const checkpointMesh = checkpointMeshRef.current;
    if (!aircraft || !checkpointMesh) return;

    cooldown.current -= delta;

    aircraftBox.setFromObject(aircraft);
    checkpointBox.setFromObject(checkpointMesh);

    if (
      aircraftBox.intersectsBox(checkpointBox) &&
      !checkpoint.current.didPass &&
      cooldown.current <= 0
    ) {
      checkpoint.current.didPass = true;
      cooldown.current = cooldownTime;
    }

    if (
      !aircraftBox.intersectsBox(checkpointBox) &&
      cooldown.current <= 0 &&
      checkpoint.current.didPass
    ) {
      checkpoint.current.didPass = false;
    }
  });

  return checkpoint;
}
