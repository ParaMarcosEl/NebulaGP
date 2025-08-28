// import { useRef, useEffect, useCallback } from "react";
// import * as THREE from "three";
// import {MineExplosionParticles} from "./ExplosionParticles";

// export interface Explosion {
//   system: MineExplosionParticles;
//   active: boolean;
// }

// export function useExplosion(scene: THREE.Scene, poolSize: number = 5) {
//   const explosionsRef = useRef<Explosion[]>([]);

//   // Initialize pool
//   useEffect(() => {
//     const explosions: Explosion[] = [];

//     for (let i = 0; i < poolSize; i++) {
//       const system = new MineExplosionParticles({
//         maxParticles: 300,
//         speed: 20,
//         duration: 1.5, // explosion lifetime
//         lifetime: 2.0,
//         majorRadius: 1.0,
//         minorRadius: 0.2,
//       });

//       system.mesh.visible = false;
//       scene.add(system.mesh);

//       explosions.push({ system, active: false });
//     }

//     explosionsRef.current = explosions;

//     return () => {
//       explosions.forEach(({ system }) => {
//         scene.remove(system.mesh);
//         system.dispose();
//       });
//     };
//   }, [scene, poolSize]);

//   // Update loop
//   useEffect(() => {
//     const clock = new THREE.Clock();

//     const update = () => {
//       const delta = clock.getDelta();

//       explosionsRef.current.forEach((exp) => {
//         if (exp.active) {
//           exp.system.update(delta);
//           if (!exp.system.getIsPlaying()) {
//             exp.active = false;
//             exp.system.mesh.visible = false;
//           }
//         }
//       });

//       requestAnimationFrame(update);
//     };

//     update();
//   }, []);

//   // Trigger explosion
//   const triggerExplosion = useCallback((pos: THREE.Vector3) => {
//     const explosion = explosionsRef.current.find((exp) => !exp.active);
//     if (!explosion) return; // all in use

//     explosion.active = true;
//     explosion.system.mesh.position.copy(pos);
//     explosion.system.mesh.visible = true;
//     explosion.system.play();
//   }, []);

//   return { triggerExplosion };
// }
