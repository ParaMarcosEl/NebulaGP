import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';

type Projectile = {
  mesh: THREE.Group;
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
  owner
}: {
  projectiles: Projectile[];
  playerRefs: React.RefObject<THREE.Object3D | null>[];
  onCollide: CollisionCallback;
  owner: React.RefObject<THREE.Object3D | null>;
}) {
  useFrame(() => {
    const tempBox = new THREE.Box3();
    const tempOBB = new OBB();
    const playerOBB = new OBB();

    for (const proj of projectiles) {
      if (!proj.active) continue;

      tempBox.setFromObject(proj.mesh);
      tempBox.getCenter(tempOBB.center);
      tempBox.getSize(tempOBB.halfSize).multiplyScalar(0.5);
      tempOBB.rotation.setFromMatrix4(proj.mesh.matrixWorld);


      for (const ref of playerRefs) {
        const player = ref.current;
        if (!player || player === owner.current) continue;

        const playerBox = new THREE.Box3().setFromObject(player);
        playerBox.getCenter(playerOBB.center);
        playerBox.getSize(playerOBB.halfSize).multiplyScalar(0.5);
        playerOBB.rotation.setFromMatrix4(player.matrixWorld);

        if (tempOBB.intersectsOBB(playerOBB)) {
          onCollide(player);
          proj.active = false;
          proj.mesh.visible = false;
          break; // prevent multiple hits per projectile
        }
      }
    }
  });
}
