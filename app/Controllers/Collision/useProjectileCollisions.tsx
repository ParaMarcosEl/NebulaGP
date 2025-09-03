import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { useGameStore } from '../Game/GameController';
import { MineExplosionHandle } from '@/Components/Particles/ExplosionParticles';
import { usePlaySound } from '../Audio/usePlaySounds';
import { useAudioStore } from '../Audio/useAudioStore';

type Projectile = {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  velocity: number;
  age: number;
  active: boolean;
  owner: React.RefObject<THREE.Object3D | null>;
};

type CollisionCallback = (player: THREE.Object3D) => void;

export function useProjectileCollisions({
  projectiles,
  playerRefs,
  onCollide,
  owner,
  explosionPoolRef,
}: {
  projectiles: Projectile[];
  playerRefs: React.RefObject<THREE.Object3D | null>[];
  explosionPoolRef: React.RefObject<React.RefObject<MineExplosionHandle>[]>;
  onCollide: CollisionCallback;
  owner: React.RefObject<THREE.Object3D | null>;
}) {
  const tempBox = new THREE.Box3();
  const tempOBB = new OBB();
  const playerOBB = new OBB();
  const playerBox = new THREE.Box3();
  const { setShieldValue } = useGameStore((s) => s);
  const playSound = usePlaySound();
  const { buffers } = useAudioStore((s) => s);

  useFrame(() => {
    for (const proj of projectiles) {
      if (!proj.active) continue;

      tempBox.setFromObject(proj.mesh);
      tempBox.getCenter(tempOBB.center);
      tempBox.getSize(tempOBB.halfSize).multiplyScalar(0.5);
      tempOBB.rotation.setFromMatrix4(proj.mesh.matrixWorld);

      for (const ref of playerRefs) {
        const player = ref.current;
        if (!player || player === owner.current) continue;

        playerBox.setFromObject(player);
        playerBox.getCenter(playerOBB.center);
        playerBox.getSize(playerOBB.halfSize).multiplyScalar(0.5);
        playerOBB.rotation.setFromMatrix4(player.matrixWorld);

        if (tempOBB.intersectsOBB(playerOBB)) {
          const { shieldValue, id } = useGameStore.getState().raceData[player.userData.id];
          if (!shieldValue || shieldValue <= 0) {
            onCollide(player);
          } else {
            setShieldValue(shieldValue - 0.2, id);
          }
          // Trigger explosion if available
          if (explosionPoolRef.current && explosionPoolRef.current.length > 0) {
            const availableExplosion = explosionPoolRef.current.find(
              (ref) => ref.current && !ref.current.isPlaying(),
            );
            availableExplosion?.current?.play(proj.mesh.position);
          }
          // play explosion sound
          playSound(buffers['explosion'], proj.mesh.position, 0.5);
          proj.active = false;
          proj.mesh.visible = false;
          break; // prevent multiple hits per projectile
        }
      }
    }
  });
}
