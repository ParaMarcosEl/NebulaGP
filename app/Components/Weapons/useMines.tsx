import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { onBulletCollision } from '@/Utils/collisions';
import { useGameStore } from '@/Controllers/Game/GameController';
import { MineExplosionHandle } from '../Particles/ExplosionParticles';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import { usePlaySound } from '@/Controllers/Audio/usePlaySounds';

export type Mine = {
  mesh: THREE.Mesh;
  active: boolean;
  owner: React.RefObject<THREE.Object3D>;
};

export function useMines(
  shipRef: React.RefObject<THREE.Object3D>,
  poolRef: React.RefObject<Mine[]>,
  explosionPoolRefs: React.RefObject<React.RefObject<MineExplosionHandle>[]>,
  { maxMines = 10, dropOffset = 5 } = {},
) {
  const { scene } = useThree();
  const origin = new THREE.Vector3();
  const backward = new THREE.Vector3(0, 0, 1);
  const playerPos = new THREE.Vector3();
  const cooldown = 3;
  const lastFiredRef = useRef(0);
  const { raceData, setShieldValue } = useGameStore((s) => s);
  const { buffers, masterVolume, sfxVolume } = useAudioStore((s) => s);
  const playSound = usePlaySound();

  if (poolRef.current.length === 0) {
    for (let i = 0; i < maxMines; i++) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(2, 16, 16),
        new THREE.MeshStandardMaterial({ color: 'red' }),
      );
      sphere.visible = false;
      scene.add(sphere);

      poolRef.current.push({
        mesh: sphere,
        active: false,
        owner: shipRef,
      });
    }
  }

  const drop = (currentTime: number) => {
    if (!shipRef.current) return;
    if (currentTime - lastFiredRef.current < cooldown) return;
    lastFiredRef.current = currentTime;

    const available = poolRef.current.find((m) => !m.active);
    if (!available) return;

    backward
      .applyQuaternion(shipRef.current.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    origin.setFromMatrixPosition(shipRef.current.matrixWorld);
    const dropPos = origin.clone().add(backward.multiplyScalar(dropOffset));

    available.mesh.position.copy(dropPos);
    available.mesh.visible = true;
    available.active = true;

    playSound(buffers['mineDrop'], dropPos, 1 * masterVolume * sfxVolume);
  };

  const deactivateMine = (mine: Mine) => {
    mine.active = false;
    mine.mesh.visible = false;

    // Defensive check to ensure the explosion pool and its contents exist
    if (explosionPoolRefs.current && explosionPoolRefs.current.length > 0) {
      // Find the first inactive explosion in the pool
      const availableExplosion = explosionPoolRefs.current.find(
        (ref) => ref.current && !ref.current.isPlaying(),
      );

      // If an available explosion is found, play it at the mine's position
      if (availableExplosion?.current) {
        availableExplosion.current.play(mine.mesh.position);
      }
    }
  };

  useFrame(() => {
    if (shipRef.current) {
      playerPos.setFromMatrixPosition(shipRef.current.matrixWorld);
    }

    poolRef.current.forEach((mine) => {
      if (!mine.active) return;

      const dist = playerPos.distanceTo(mine.mesh.position);
      if (dist < 5) {
        const { id, shieldValue } = raceData[shipRef.current.userData.id];
        if (shieldValue > 0) {
          setShieldValue(shieldValue - 0.5, id);
        } else {
          onBulletCollision(shipRef.current, 1, 2);
        }
        deactivateMine(mine);
        playSound(buffers['explosion'], mine.mesh.position, 0.5 * masterVolume * sfxVolume);
      }
    });
  });

  return {
    drop: () => drop(performance.now() / 1000),
    poolRef,
  };
}
