'use client';
// SpeedPadController.ts
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';
import { usePlaySound } from '@/Controllers/Audio/usePlaySounds';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';

type SpeedPad = {
  mesh: THREE.Mesh;
  didPass: boolean;
};

export function useSpeedPadController({
  playerRefs,
  speedPadRef,
  cooldownTime = 2,
}: {
  playerRefs: {
    id: number;
    ref: React.RefObject<THREE.Object3D>;
  }[];
  speedPadRef: React.RefObject<THREE.Mesh>;
  cooldownTime?: number;
}) {
  const { applyBoost } = useGameStore((s) => s);
  const playSound = usePlaySound();
  const { buffers, audioEnabled } = useAudioStore((s) => s);

  const speedPad = useRef<SpeedPad>({
    mesh: speedPadRef.current as THREE.Mesh,
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
    const speedPadMesh = speedPadRef.current;
    if (!(players.length > 0) || !speedPad) return;

    cooldown.current -= delta;

    const playerBoxes = players.map((player) => ({
      id: player.id,
      box: new THREE.Box3().setFromObject(player.mesh),
    }));
    const speedPadBox = new THREE.Box3().setFromObject(speedPadMesh);
    const craft = playerBoxes.find((craft) => craft.box.intersectsBox(speedPadBox));

    if (!!craft && cooldown.current <= 0) {
      speedPad.current.didPass = true;
      cooldown.current = cooldownTime;
      applyBoost(craft.id);
      if (audioEnabled) playSound(buffers['speedup01'], speedPadRef.current.position, 1);
    }

    if (!craft && cooldown.current <= 0 && speedPad.current.didPass) {
      speedPad.current.didPass = false;
    }
  });

  return speedPad;
}
