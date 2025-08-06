// import { useRef } from 'react';
// import * as THREE from 'three';
// import { useFrame, useThree } from '@react-three/fiber';
// import { RapierRigidBody } from 'node_modules/@react-three/rapier/dist/react-three-rapier.cjs';

// type Projectile = {
//   mesh: THREE.Mesh;
//   direction: THREE.Vector3;
//   velocity: number;
//   age: number;
//   active: boolean;
// };

// export function useProjectiles(shipRef: React.RefObject<RapierRigidBody>, { fireRate = 2, maxProjectiles = 20, velocity = 200 }) {
//   const { scene } = useThree();
//   const poolRef = useRef<Projectile[]>([]);
//   const lastFiredRef = useRef(0); // seconds
//   const cooldown = 1 / fireRate;
//   const lifetime = 2; // seconds

//   // Initialize pool once
//   if (poolRef.current.length === 0) {
//     for (let i = 0; i < maxProjectiles; i++) {
//       const geometry = new THREE.SphereGeometry(0.2, 16, 16);
//       const material = new THREE.MeshStandardMaterial({ color: 0xff2200 });
//       const sphere = new THREE.Mesh(geometry, material);
//       sphere.visible = false;
//       scene.add(sphere);

//       poolRef.current.push({
//         mesh: sphere,
//         direction: new THREE.Vector3(),
//         velocity,
//         age: 0,
//         active: false,
//       });
//     }
//   }

//   const fire = (currentTime: number) => {
//     if (!shipRef.current) return;
//     if (currentTime - lastFiredRef.current < cooldown) return;
//     lastFiredRef.current = currentTime;

//     const available = poolRef.current.find((p) => !p.active);
//     if (!available) return; // no available projectiles in the pool

//     // Get forward direction in world space
//     const forward = new THREE.Vector3(0, 0, -1)
//       .applyQuaternion(shipRef.current.current.getWorldQuaternion(new THREE.Quaternion()))
//       .normalize();

//     const origin = new THREE.Vector3().setFromMatrixPosition(shipRef.current.matrixWorld);

//     available.mesh.position.copy(origin);
//     available.direction.copy(forward);
//     available.age = 0;
//     available.active = true;
//     available.mesh.visible = true;
//   };

//   useFrame((_, delta) => {
//     poolRef.current.forEach((proj) => {
//       if (!proj.active) return;

//       proj.mesh.position.addScaledVector(proj.direction, proj.velocity * delta);
//       proj.age += delta;

//       if (proj.age > lifetime) {
//         proj.active = false;
//         proj.mesh.visible = false;
//       }
//     });
//   });

//   return {
//     fire: () => fire(performance.now() / 1000),
//   };
// }
