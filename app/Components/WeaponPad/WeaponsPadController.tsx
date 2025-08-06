'use client';
// controllers/CheckpointController.ts
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';

type WeaponsPad = {
  mesh: THREE.Mesh;
  didPass: boolean;
};

export function useWeaponsPad({
  playerRefs,
  weaponsPadRef,
  cooldownTime = 2,
}: {
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
  weaponsPadRef: React.RefObject<THREE.Mesh>;
  cooldownTime?: number;
}) {
  const { setCannon, raceData } = useGameStore((s) => s);

  const weaponsPad = useRef<WeaponsPad>({
    mesh: weaponsPadRef.current as THREE.Mesh,
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
    const weaponsPadMesh = weaponsPadRef.current;
    if (!(players.length > 0) || !weaponsPad) return;

    cooldown.current -= delta;

    const playerBoxes = players.map((player) => ({
      id: player.id,
      box: new THREE.Box3().setFromObject(player.mesh),
    }));
    const WeaponsPadBox = new THREE.Box3().setFromObject(weaponsPadMesh);
    const craft = playerBoxes.find((craft) => craft.box.intersectsBox(WeaponsPadBox));

    if (!!craft && cooldown.current <= 0) {
      weaponsPad.current.didPass = true;
      cooldown.current = cooldownTime;
      setCannon(craft.id, true);
    }

    if (!craft && cooldown.current <= 0 && weaponsPad.current.didPass) {
      weaponsPad.current.didPass = false;
    }
  });

  return weaponsPad;
}
