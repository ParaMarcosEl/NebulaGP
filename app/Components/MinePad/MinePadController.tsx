'use client';
// MinePadController.tsx

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';

type MinePad = {
  mesh: THREE.Mesh;
  didPass: boolean;
};

export function useMinePad({
  playerRefs,
  minePadRef,
  cooldownTime = 2,
}: {
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
  minePadRef: React.RefObject<THREE.Mesh>;
  cooldownTime?: number;
}) {
  const { setUseMine, raceData } = useGameStore((s) => s);

  const minePad = useRef<MinePad>({
    mesh: minePadRef.current as THREE.Mesh,
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
    const minePadMesh = minePadRef.current;
    if (!(players.length > 0) || !minePad) return;

    cooldown.current -= delta;

    const playerBoxes = players.map((player) => ({
      id: player.id,
      box: new THREE.Box3().setFromObject(player.mesh),
    }));
    const minePadBox = new THREE.Box3().setFromObject(minePadMesh);
    const craft = playerBoxes.find((craft) => craft.box.intersectsBox(minePadBox));
    if (!!craft && cooldown.current <= 0) {
      const { id, cannonValue, useMine, shieldValue } = raceData[craft.id];
      minePad.current.didPass = true;
      cooldown.current = cooldownTime;
      if (cannonValue > 0 || shieldValue > 0 || useMine) return;
      setUseMine(id, true);
    }

    if (!craft && cooldown.current <= 0 && minePad.current.didPass) {
      minePad.current.didPass = false;
    }
  });

  return minePad;
}
