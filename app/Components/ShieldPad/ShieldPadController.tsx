'use client';
// controllers/CheckpointController.ts
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';

type ShieldPad = {
  mesh: THREE.Mesh;
  didPass: boolean;
};

export function useShieldPadController({
  playerRefs,
  shieldPadRef,
  cooldownTime = 2,
}: {
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
  shieldPadRef: React.RefObject<THREE.Mesh>;
  cooldownTime?: number;
}) {
  const { setShieldValue, raceData } = useGameStore((s) => s);

  const shieldPad = useRef<ShieldPad>({
    mesh: shieldPadRef.current as THREE.Mesh,
    didPass: false,
  });
  const cooldown = useRef(0);
  // const clock = new THREE.Clock(); // Clock for delta time calculation

  useFrame((_, delta) => {
    const players = playerRefs.map(
      ({ id, ref }: { id: number; ref: React.RefObject<THREE.Object3D> }) => ({
        id,
        mesh: ref.current,
      }),
    );
    const shieldPadMesh = shieldPadRef.current;
    if (!(players.length > 0) || !shieldPad) return;

    cooldown.current -= delta;

    const playerBoxes = players.map((player) => ({
      id: player.id,
      box: new THREE.Box3().setFromObject(player.mesh),
    }));
    const shieldPadBox = new THREE.Box3().setFromObject(shieldPadMesh);
    const craft = playerBoxes.find((craft) => craft.box.intersectsBox(shieldPadBox));

    if (!!craft && cooldown.current <= 0) {
      const { useMine, cannonValue, shieldValue } = raceData[craft.id];
      shieldPad.current.didPass = true;
      cooldown.current = cooldownTime;
      if (useMine || cannonValue > 0 || shieldValue > 0) return;
      setShieldValue(1, craft.id);
    }

    if (!craft && cooldown.current <= 0 && shieldPad.current.didPass) {
      shieldPad.current.didPass = false;
    }
  });

  return shieldPad;
}
