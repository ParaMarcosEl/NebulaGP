import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from 'node_modules/@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';



export type Projectile = {
  mesh: THREE.Group;
  direction: THREE.Vector3;
  velocity: number;
  age: number;
  active: boolean;
  owner: React.RefObject<THREE.Object3D>;
};

export function useProjectiles(shipRef: React.RefObject<THREE.Object3D>, { fireRate = 2, maxProjectiles = 20, velocity = 200 }) {
  const { scene } = useThree();
  const poolRef = useRef<Projectile[]>([]);
  const lastFiredRef = useRef(0); // seconds
  const cooldown = 1 / fireRate;
  const lifetime = 2; // seconds
  const gltf = useGLTF('/models/missile.glb');

  // Initialize pool once
  if (poolRef.current.length === 0) {
    for (let i = 0; i < maxProjectiles; i++) {
      const missile = SkeletonUtils.clone(gltf.scene) as THREE.Group;
      
      missile.visible = false;
      scene.add(missile);
      
      poolRef.current.push({
        mesh: missile,
        direction: new THREE.Vector3(),
        velocity,
        age: 0,
        active: false,
        owner: shipRef
      });
    }
  }

  const fire = (currentTime: number) => {
    if (!shipRef.current) return;
    if (currentTime - lastFiredRef.current < cooldown) return;
    lastFiredRef.current = currentTime;

    const available = poolRef.current.find((p) => !p.active);
    if (!available) return; // no available projectiles in the pool

    // Get forward direction in world space
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(shipRef.current.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    const origin = new THREE.Vector3().setFromMatrixPosition(shipRef.current.matrixWorld);

    available.mesh.position.copy(origin);
    available.direction.copy(forward);
    available.age = 0;
    available.active = true;
    available.mesh.visible = true;
  };

  useFrame((_, delta) => {
  poolRef.current.forEach((proj) => {
    if (!proj.active) return;

    // Move projectile
    proj.mesh.position.addScaledVector(proj.direction, proj.velocity * delta);

    // Make it face the direction it's traveling
    const targetPos = proj.mesh.position.clone().add(proj.direction);
    proj.mesh.lookAt(targetPos);

    proj.age += delta;

    if (proj.age > lifetime) {
      proj.active = false;
      proj.mesh.visible = false;
    }
  });
  });

  return {
    fire: () => fire(performance.now() / 1000),
    poolRef
  };
}
