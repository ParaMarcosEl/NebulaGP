import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController';
import { MineExplosionHandle } from '../Particles/ExplosionParticles';
import { usePlaySound } from '@/Controllers/Audio/usePlaySounds';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';

export type Projectile = {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  velocity: number;
  age: number;
  active: boolean;
  owner: React.RefObject<THREE.Object3D>;
};

export function useProjectiles(
  shipRef: React.RefObject<THREE.Object3D>,
  explosionPoolRef: React.RefObject<React.RefObject<MineExplosionHandle>[]>,
  { fireRate = 2, maxProjectiles = 20, velocity = 200 },
) {
  const { scene } = useThree();
  const { setCannon, raceData } = useGameStore((s) => s);
  const { buffers, masterVolume, sfxVolume } = useAudioStore((s) => s);
  const playSound = usePlaySound();

  const poolRef = useRef<Projectile[]>([]);
  const lastFiredRef = useRef(0); // seconds
  const cooldown = 1 / fireRate;
  const lifetime = 1; // seconds

  // Reusable geometry and material to avoid new allocations
  const geometryRef = useRef(new THREE.SphereGeometry(1, 8, 8)); // Small radius, low poly
  const materialRef = useRef(new THREE.MeshBasicMaterial({ color: 'white' }));

  // Reusable objects to avoid allocations
  const tempForward = useRef(new THREE.Vector3(0, 0, -1));
  const tempQuaternion = useRef(new THREE.Quaternion());

  // Centralized cleanup
  const cleanupProjectiles = () => {
    poolRef.current.forEach((p) => {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (Array.isArray(p.mesh.material) ? p.mesh.material : [p.mesh.material]).forEach((m) =>
        m.dispose(),
      );
    });
    poolRef.current = [];
  };

  useEffect(() => {
    // Initialize projectile pool with elongated spheres
    poolRef.current = Array.from({ length: maxProjectiles }, () => {
      const missile = new THREE.Mesh(geometryRef.current, materialRef.current);
      missile.scale.set(0.1, 0.1, 1); // Elongate along the Z-axis
      missile.visible = false;
      scene.add(missile);

      return {
        mesh: missile,
        direction: new THREE.Vector3(),
        velocity,
        age: 0,
        active: false,
        owner: shipRef,
      };
    });

    return cleanupProjectiles;
  }, [maxProjectiles, scene, shipRef, velocity]);

  const fire = (currentTime: number, id: number) => {
    if (!shipRef.current) return;
    if (currentTime - lastFiredRef.current < cooldown) return;

    const available = poolRef.current.find((p) => !p.active);
    if (!available) return;

    setCannon(id, raceData[id].cannonValue - 1);
    lastFiredRef.current = currentTime;

    // Get the ship's world rotation and compute the forward direction
    shipRef.current.getWorldQuaternion(tempQuaternion.current);
    tempForward.current.set(0, 0, -1).applyQuaternion(tempQuaternion.current).normalize();

    // Set projectile properties
    available.mesh.position.copy(shipRef.current.position);

    // Orient the missile correctly to face its direction of travel
    // This orients the mesh's local -Z axis (its "nose") with the forward direction
    available.mesh.lookAt(available.mesh.position.clone().add(tempForward.current));

    // Set the missile's direction
    available.direction.copy(tempForward.current);
    available.age = 0;
    available.active = true;
    available.mesh.visible = true;
    playSound(
      buffers.lazer,
      shipRef.current.position,
      (id === 0 ? 0.5 : 1) * masterVolume * sfxVolume,
    );
  };

  useFrame((_, delta) => {
    const pool = poolRef.current;

    for (let i = 0; i < pool.length; i++) {
      const proj = pool[i];
      if (!proj.active) continue;

      // Move projectile along its direction vector
      proj.mesh.position.addScaledVector(proj.direction, proj.velocity * delta);

      // Update age
      proj.age += delta;

      // Deactivate if expired
      if (proj.age > lifetime) {
        const explosions = explosionPoolRef.current;
        if (explosions?.length) {
          const exp = explosions.find((ref) => ref.current && !ref.current.isPlaying());
          exp?.current?.play(proj.mesh.position);
        }
        proj.active = false;
        proj.mesh.visible = false;
      }
    }
  });

  return {
    fire: (id: number) => fire(performance.now() / 1000, id),
    poolRef,
  };
}
