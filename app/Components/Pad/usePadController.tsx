'use client';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';
import { usePlaySound } from '@/Controllers/Audio/usePlaySounds';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';

type Pad = {
  mesh: THREE.Mesh;
  didPass: boolean;
};

type PlayerRef = { id: number; ref: React.RefObject<THREE.Object3D> };

function usePadController(
  playerRefs: PlayerRef[],
  padRef: React.RefObject<THREE.Mesh>,
  cooldownTime: number,
  onActivate: (playerId: number) => void
) {
  const cooldown = useRef(0);
  const pad = useRef<Pad>({ mesh: padRef.current!, didPass: false });

  // Pre-allocate Box3 objects for collision detection
  const playerBoxes = useMemo(() => playerRefs.map(() => new THREE.Box3()), [playerRefs.length]);
  const padBox = useRef(new THREE.Box3());

  useFrame((_, delta) => {
    const padMesh = padRef.current;
    if (!padMesh || playerRefs.length === 0) return;

    cooldown.current -= delta;

    // Update player bounding boxes
    for (let i = 0; i < playerRefs.length; i++) {
      const playerMesh = playerRefs[i].ref.current;
      if (playerMesh) playerBoxes[i].setFromObject(playerMesh);
    }

    // Update pad bounding box
    padBox.current.setFromObject(padMesh);

    // Check collisions
    const craftIdx = playerBoxes.findIndex((box) => box.intersectsBox(padBox.current));

    if (craftIdx !== -1 && cooldown.current <= 0) {
      const playerId = playerRefs[craftIdx].id;
      pad.current.didPass = true;
      cooldown.current = cooldownTime;
      onActivate(playerId);
    }

    if (craftIdx === -1 && cooldown.current <= 0 && pad.current.didPass) {
      pad.current.didPass = false;
    }
  });

  return pad;
}

// --- Individual pad hooks ---
export function useMinePad(playerRefs: PlayerRef[], minePadRef: React.RefObject<THREE.Mesh>, cooldownTime = 2) {
  const { setUseMine, raceData } = useGameStore();
  return usePadController(playerRefs, minePadRef, cooldownTime, (id) => {
    const { cannonValue, shieldValue, useMine } = raceData[id];
    if (!cannonValue && !shieldValue && !useMine) setUseMine(id, true);
  });
}

export function useShieldPad(playerRefs: PlayerRef[], shieldPadRef: React.RefObject<THREE.Mesh>, cooldownTime = 2) {
  const { setShieldValue, raceData } = useGameStore();
  return usePadController(playerRefs, shieldPadRef, cooldownTime, (id) => {
    const { cannonValue, shieldValue, useMine } = raceData[id];
    if (!cannonValue && !shieldValue && !useMine) setShieldValue(1, id);
  });
}

export function useWeaponsPad(playerRefs: PlayerRef[], weaponsPadRef: React.RefObject<THREE.Mesh>, cooldownTime = 2) {
  const { setCannon, raceData } = useGameStore();
  return usePadController(playerRefs, weaponsPadRef, cooldownTime, (id) => {
    const { cannonValue, shieldValue, useMine } = raceData[id];
    if (!cannonValue && !shieldValue && !useMine) setCannon(id, 10);
  });
}

export function useSpeedPad(playerRefs: PlayerRef[], speedPadRef: React.RefObject<THREE.Mesh>, cooldownTime = 2) {
    const { applyBoost } = useGameStore();
        const playSound = usePlaySound();
        const { buffers, audioEnabled } = useAudioStore((s) => s);
    return usePadController(playerRefs, speedPadRef, cooldownTime, (id) => {
        applyBoost(id);
        if (audioEnabled) playSound(buffers['speedup01'], speedPadRef.current.position, 1);
    })
}
