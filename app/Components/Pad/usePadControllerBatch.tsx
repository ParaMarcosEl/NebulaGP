'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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

export function usePadControllerBatch(playerRefs: PlayerRef[], pads: PadData[], cellSize = 10) {
  const { setUseMine, setShieldValue, setCannon, applyBoost, raceData } = useGameStore();
  const { buffers, audioEnabled } = useAudioStore();
  const playSound = usePlaySound();

  const cooldowns = useRef<number[]>(pads.map(() => 0));

  const PAD_HALF_SIZE = new THREE.Vector3(2.5, 2.5, 2.5);
  const PLAYER_RADIUS = 5;

  const tmpPadPos = new THREE.Vector3();
  const tmpPlayerPos = new THREE.Vector3();

  const accumulator = useRef(0);
  const targetHz = 30;
  const tickInterval = 1 / targetHz;

  const events = useRef<{ type: PadType; playerId: number; padIdx: number }[]>([]);

  // --- Build 3D Grid for static pads ---
  const gridData = useMemo(() => {
    const grid = new Map<string, PadData[]>();
    const key = (pos: THREE.Vector3) =>
      `${Math.floor(pos.x / cellSize)}|${Math.floor(pos.y / cellSize)}|${Math.floor(pos.z / cellSize)}`;
    const tmp = new THREE.Vector3();

    for (let i = 0; i < pads.length; i++) {
      const padMesh = pads[i].meshRef.current;
      if (!padMesh) continue;
      padMesh.getWorldPosition(tmp);
      const k = key(tmp);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push(pads[i]);
    }

    return { grid, key, cellSize };
  }, [pads, cellSize]);

  // --- Helper: Query nearby pads ---
  const queryNearbyPads = (playerPos: THREE.Vector3, radius: number) => {
    const nearbyPads: PadData[] = [];
    const { grid, cellSize } = gridData;

    const minX = Math.floor((playerPos.x - radius) / cellSize);
    const maxX = Math.floor((playerPos.x + radius) / cellSize);
    const minY = Math.floor((playerPos.y - radius) / cellSize);
    const maxY = Math.floor((playerPos.y + radius) / cellSize);
    const minZ = Math.floor((playerPos.z - radius) / cellSize);
    const maxZ = Math.floor((playerPos.z + radius) / cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const k = `${x}|${y}|${z}`;
          const cell = grid.get(k);
          if (cell) nearbyPads.push(...cell);
        }
      }
    }

    return nearbyPads;
  };

  // --- Main loop ---
  useFrame((_, delta) => {
    accumulator.current += delta;

    // decrement cooldowns
    for (let p = 0; p < cooldowns.current.length; p++) {
      cooldowns.current[p] = Math.max(0, cooldowns.current[p] - delta);
    }

    if (accumulator.current < tickInterval) return;
    accumulator.current = 0;

    for (let i = 0; i < playerRefs.length; i++) {
      const playerMesh = playerRefs[i].ref.current;
      if (!playerMesh) continue;
      playerMesh.getWorldPosition(tmpPlayerPos);

      const nearbyPads = queryNearbyPads(tmpPlayerPos, PLAYER_RADIUS + PAD_HALF_SIZE.length());

      for (const pad of nearbyPads) {
        const padMesh = pad.meshRef.current;
        if (!padMesh) continue;

        padMesh.getWorldPosition(tmpPadPos);
        const distSq = tmpPadPos.distanceToSquared(tmpPlayerPos);
        const threshold = (PLAYER_RADIUS + PAD_HALF_SIZE.length()) ** 2;
        const padIdx = pads.indexOf(pad);

        if (distSq <= threshold && cooldowns.current[padIdx] <= 0) {
          pad.didPass = true;
          cooldowns.current[padIdx] = pad.cooldownTime;
          events.current.push({ type: pad.type, playerId: playerRefs[i].id, padIdx });
        } else if (distSq > threshold && cooldowns.current[padIdx] <= 0 && pad.didPass) {
          pad.didPass = false;
        }
      }
    }

    // process deferred events
    if (events.current.length > 0) {
      for (const ev of events.current) {
        const { type, playerId, padIdx } = ev;
        switch (type) {
          case 'mine':
            if (
              !raceData[playerId].cannonValue &&
              !raceData[playerId].shieldValue &&
              !raceData[playerId].useMine
            ) {
              setUseMine(playerId, true);
            }
            break;
          case 'shield':
            setShieldValue(1, playerId);
            break;
          case 'cannon':
            setCannon(playerId, 10);
            break;
          case 'speed':
            applyBoost(playerId);
            if (audioEnabled && pads[padIdx].meshRef.current) {
              playSound(buffers['speedup01'], pads[padIdx].meshRef.current.position, 1);
            }
            break;
        }
      }
      events.current.length = 0;
    }
  });
}
