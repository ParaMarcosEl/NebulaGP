'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type CannonProps = {
  parentRef: React.RefObject<THREE.Object3D>;
  offset?: THREE.Vector3; // Local offset from the parent (e.g., front of the ship)
  onShoot?: (projectile: THREE.Mesh) => void;
};

const PROJECTILE_SPEED = 200;
const FIRE_COOLDOWN = 0.25;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Cannon({
  parentRef,
  offset = new THREE.Vector3(0, 0, -5),
  onShoot,
}: CannonProps) {
  const [projectiles, setProjectiles] = useState<THREE.Mesh[]>([]);
  const timeSinceLastShot = useRef(0);
  const cannonWorldPos = useRef(new THREE.Vector3());
  const cannonForward = useRef(new THREE.Vector3());

  useEffect(() => {
    const shoot = () => {
      if (!parentRef.current) return;

      const projectileGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);

      // Use world position and direction of the cannon
      projectile.position.copy(cannonWorldPos.current);
      projectile.userData.velocity = cannonForward.current.clone().multiplyScalar(PROJECTILE_SPEED);

      setProjectiles((prev) => [...prev, projectile]);
      onShoot?.(projectile);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (timeSinceLastShot.current <= 0) {
          shoot();
          timeSinceLastShot.current = FIRE_COOLDOWN;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShoot, parentRef]);

  useFrame((_, delta) => {
    timeSinceLastShot.current -= delta;
    const parent = parentRef.current;
    // Update cannon's world position and forward direction based on parent
    if (parent) {
      const offset = new THREE.Vector3(0, 0, 0).applyQuaternion(parent.quaternion);
      const desiredPosition = parent.position.clone().add(offset);
      // Get forward direction (-Z in local space)
      cannonForward.current.copy(desiredPosition);
    }

    // Update projectiles
    setProjectiles((prev) =>
      prev
        .map((p) => {
          if (p.userData.velocity) {
            p.position.addScaledVector(p.userData.velocity, delta);
          }
          return p;
        })
        .filter((p) => p.position.length() < 5000),
    );
  });

  return (
    <>
      {projectiles.map((p, i) => (
        <primitive object={p} key={i} />
      ))}
    </>
  );
}
