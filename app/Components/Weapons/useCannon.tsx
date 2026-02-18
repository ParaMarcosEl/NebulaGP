import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController';
import { usePlaySound } from '@/Controllers/Audio/usePlaySounds';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import ExplosionParticles, {
  ExplosionHandle,
} from '@/Components/Particles/ExplosionParticles/ExplosionParticles';

export type Projectile = {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  velocity: number;
  age: number;
  active: boolean;
  owner: React.RefObject<THREE.Object3D> | null;
};

export function useCannon(
  shipRefs: React.RefObject<THREE.Object3D>[],
  setWorkerCannon: (botId: number, value: number) => void,
  { fireRate = 2, maxProjectiles = 50, velocity = 200 },
) {
  const { scene } = useThree();
  const { setCannon, raceData } = useGameStore((s) => s);
  const { buffers, masterVolume, sfxVolume } = useAudioStore((s) => s);
  const playSound = usePlaySound();

  const explosionsRef = useRef<ExplosionHandle>(null);

  const poolRef = useRef<Projectile[]>([]);
  const lastFiredMap = useRef<Map<number, number>>(new Map()); // Per-ship cooldown tracking

  const cooldown = 1 / fireRate;
  const lifetime = 1; // seconds

  const geometryRef = useRef(new THREE.SphereGeometry(1, 8, 8));
  const materialRef = useRef(new THREE.MeshBasicMaterial({ color: 'white' }));

  const tempForward = useRef(new THREE.Vector3(0, 0, -1));
  const tempQuaternion = useRef(new THREE.Quaternion());

  // Cleanup
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
    // Initialize the projectile pool
    poolRef.current = Array.from({ length: maxProjectiles }, () => {
      const missile = new THREE.Mesh(geometryRef.current, materialRef.current);
      missile.scale.set(0.1, 0.1, 1);
      missile.visible = false;
      scene.add(missile);

      return {
        mesh: missile,
        direction: new THREE.Vector3(),
        velocity,
        age: 0,
        active: false,
        owner: null,
      };
    });

    return cleanupProjectiles;
  }, [maxProjectiles, scene, velocity]);

  const fire = (currentTime: number, id: number) => {
    const shipRef = shipRefs[id];
    if (!shipRef?.current) return;

    const lastFired = lastFiredMap.current.get(id) || 0;
    if (currentTime - lastFired < cooldown) return;

    const available = poolRef.current.find((p) => !p.active);
    if (!available) return;

    // Deduct cannon ammo
    if (raceData[id]) {
      setCannon(id, raceData[id].cannonValue - 1);
    }

    lastFiredMap.current.set(id, currentTime);

    // Get ship rotation & forward vector
    shipRef.current.getWorldQuaternion(tempQuaternion.current);
    tempForward.current.set(0, 0, -1).applyQuaternion(tempQuaternion.current).normalize();

    // Configure projectile
    available.mesh.position.copy(shipRef.current.position);
    available.mesh.lookAt(available.mesh.position.clone().add(tempForward.current));

    available.direction.copy(tempForward.current);
    available.age = 0;
    available.active = true;
    available.owner = shipRef;
    available.mesh.visible = true;

    // Play sound
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

      proj.mesh.position.addScaledVector(proj.direction, proj.velocity * delta);
      proj.age += delta;

      if (proj.age > lifetime) {
        if (explosionsRef.current) {
          explosionsRef.current.play(proj.mesh.position);
        }
        proj.active = false;
        proj.mesh.visible = false;
      }
    }
  });

  const explosionParticles = <ExplosionParticles ref={explosionsRef} />;

  return {
    fire: (id: number) => fire(performance.now() / 1000, id),
    poolRef,
    explosionParticles,
    explosionsRef,
  };
}
