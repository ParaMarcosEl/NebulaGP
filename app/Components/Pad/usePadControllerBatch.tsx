'use client';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';
import { usePlaySound } from '@/Controllers/Audio/usePlaySounds';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';

export type PadType = 'mine' | 'shield' | 'cannon' | 'speed';

export type PlayerRef = { id: number; ref: React.RefObject<THREE.Object3D> };

export type PadData = {
  type: PadType;
  meshRef: React.RefObject<THREE.Mesh>;
  cooldownTime: number;
  didPass: boolean;
};

export function usePadControllerBatch(playerRefs: PlayerRef[], pads: PadData[]) {
  const { setUseMine, setShieldValue, setCannon, applyBoost, raceData } = useGameStore();
  const playSound = usePlaySound();
  const { buffers, audioEnabled } = useAudioStore();

  const cooldowns = useRef(pads.map(() => 0));
  
  const padBoxes = useMemo(() => pads.map(() => new THREE.Box3()), [pads.length]);
  const playerBoxes = useMemo(() => playerRefs.map(() => new THREE.Box3()), [playerRefs.length]);

  useFrame((_, delta) => {
    // Update player boxes
    for (let i = 0; i < playerRefs.length; i++) {
      const mesh = playerRefs[i].ref.current;
      if (mesh) playerBoxes[i].setFromObject(mesh);
    }

    // Update pad cooldowns and boxes
    for (let p = 0; p < pads.length; p++) {
      const pad = pads[p].meshRef.current;
      if (!pad) continue;

      cooldowns.current[p] -= delta;
      padBoxes[p].setFromObject(pad);

      const craftIdx = playerBoxes.findIndex((playerBox) => playerBox.intersectsBox(padBoxes[p]));

      if (craftIdx !== -1 && cooldowns.current[p] <= 0) {
        const playerId = playerRefs[craftIdx].id;
        pads[p].didPass = true;
        cooldowns.current[p] = pads[p].cooldownTime;

        const { cannonValue, shieldValue, useMine } = raceData[playerId];

        switch (pads[p].type) {
          case 'mine':
            if (!cannonValue && !shieldValue && !useMine) setUseMine(playerId, true);
            break;
          case 'shield':
            if (!cannonValue && !shieldValue && !useMine) setShieldValue(1, playerId);
            break;
          case 'cannon':
            if (!cannonValue && !shieldValue && !useMine) setCannon(playerId, 10);
            break;
          case 'speed':
            applyBoost(playerId);
            if (audioEnabled) playSound(buffers['speedup01'], pad.position, 1);
            break;
        }
      }

      if (craftIdx === -1 && cooldowns.current[p] <= 0 && pads[p].didPass) {
        pads[p].didPass = false;
      }
    }
  });
}
