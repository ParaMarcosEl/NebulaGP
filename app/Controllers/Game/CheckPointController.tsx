// controllers/CheckpointController.ts
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from './GameController';
import { TOTAL_LAPS } from '@/Constants';

type Checkpoint = {
  mesh: THREE.Mesh;
  didPass: boolean[];
};

export function useCheckpointController({
  playerRefs,
  checkpointMeshRef,
  cooldownTime = 2,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[];
  checkpointMeshRef: React.RefObject<THREE.Mesh>;
  cooldownTime?: number;
}) {
  const checkpoint = useRef<Checkpoint>({
    mesh: checkpointMeshRef.current as THREE.Mesh,
    didPass: [false, false, false, false, false, false, false, false],
  });
  const aircraftBox = new THREE.Box3();
  const checkpointBox = new THREE.Box3();
  const cooldown = useRef([0, 0, 0, 0, 0, 0, 0, 0]);
  const { completeLap, raceData, playerId, setRaceComplete, setPlayerPhase } = useGameStore(
    (s) => s,
  );
  const players = playerRefs?.map((ref, id) => {
    return raceData[id];
  });
  // const clock = new THREE.Clock(); // Clock for delta time calculation

  useFrame((_, delta) => {
    if (!players || !players.length) return;
    playerRefs.forEach((ref, i) => {
      const aircraft = ref.current;
      const checkpointMesh = checkpointMeshRef.current;
      if (!aircraft || !checkpointMesh) return;

      cooldown.current[i] -= delta;

      aircraftBox.setFromObject(aircraft);
      checkpointBox.setFromObject(checkpointMesh);

      if (
        aircraftBox.intersectsBox(checkpointBox) &&
        !checkpoint.current.didPass[i] &&
        cooldown.current[i] <= 0
      ) {
        completeLap(players[i].id, performance.now());

        // Check if the current racer is the player AND they have completed more than TOTAL_LAPS.
        // Note: The condition `player.lapCount > TOTAL_LAPS` seems to imply laps are counted *after* completion.
        // If TOTAL_LAPS is the target, then `player.lapCount === TOTAL_LAPS` might be more accurate for detecting race completion.
        if (players[i].id === playerId && players[i].lapCount > TOTAL_LAPS) {
          setRaceComplete(); // Mark the player's race as completed in the store.
          setPlayerPhase('Finished'); // Set the player's phase to 'Finished'.
        }
        checkpoint.current.didPass[i] = true;
        cooldown.current[i] = cooldownTime;
      }

      if (
        !aircraftBox.intersectsBox(checkpointBox) &&
        cooldown.current[i] <= 0 &&
        checkpoint.current.didPass[i]
      ) {
        checkpoint.current.didPass[i] = false;
      }
    });
  });

  return checkpoint;
}
