import * as THREE from 'three';

export type onBulletCollision = (
  mesh: THREE.Object3D<THREE.Object3DEventMap>,
  restitution: number | undefined,
  multiplier: number | undefined,
  triggerImpulseFromMain: (botId: number, impulse: [number, number, number]) => void,
  botRefToId: Map<THREE.Object3D, number>,
) => void;

export const onBulletCollisionWorker = (
  mesh: THREE.Object3D,
  restitution = 0.2,
  multiplier = 1,
  triggerImpulseFromMain: (botId: number, impulse: [number, number, number]) => void,
  botRefToId: Map<THREE.Object3D, number>,
) => {
  // Calculate the impulse magnitude
  const impulseMagnitude = -(1 + restitution) * multiplier;

  // The impulse vector for each mesh
  const impulseVector = mesh.userData.velocity.clone().multiplyScalar(impulseMagnitude);
  const botId1 = botRefToId.get(mesh);

  if (botId1 !== undefined) {
    triggerImpulseFromMain(botId1, impulseVector.toArray() as [number, number, number]);
  }

  if (!botId1 && mesh.userData.impulseVelocity) {
    mesh.userData.impulseVelocity.add(impulseVector.clone().multiplyScalar(-impulseMagnitude));
  }
};

export const onBulletCollision = (mesh2: THREE.Object3D, restitution = 0.2, multiplier = 1) => {
  // Check if both meshes have a velocity vector
  if (!mesh2.userData.velocity) {
    return;
  }

  // Calculate the impulse magnitude
  const impulseMagnitude = -(1 + restitution) * multiplier;

  // The impulse vector for each mesh
  const impulseVector = mesh2.userData.velocity.clone().multiplyScalar(impulseMagnitude);

  mesh2.userData.impulseVelocity.add(impulseVector.clone().multiplyScalar(-impulseMagnitude));
};

export type OnShipCollision = (
  mesh1: THREE.Object3D,
  mesh2: THREE.Object3D,
  triggerImpulseFromMain: (botId: number, impulse: [number, number, number]) => void,
  botRefToId: Map<THREE.Object3D, number>,
) => void;

export const onShipCollisionWorker = (
  mesh1: THREE.Object3D,
  mesh2: THREE.Object3D,
  triggerImpulseFromMain: (botId: number, impulse: [number, number, number]) => void,
  botRefToId: Map<THREE.Object3D, number>,
) => {
  // Both meshes must have positions
  const position1 = mesh1.position;
  const position2 = mesh2.position;

  // Collision normal
  const collisionNormal = new THREE.Vector3().subVectors(position1, position2).normalize();

  // Approximate relative velocity if available, fallback to zero
  const velocity1 = mesh1.userData.velocity ?? new THREE.Vector3();
  const velocity2 = mesh2.userData.velocity ?? new THREE.Vector3();
  const relativeVelocity = new THREE.Vector3().subVectors(velocity1, velocity2);

  const speedOfImpact = relativeVelocity.dot(collisionNormal);
  if (speedOfImpact > 0) return; // moving apart

  const restitution = 0.5;
  const impulseMagnitude = -(1 + restitution) * speedOfImpact;
  const impulseVector = collisionNormal.clone().multiplyScalar(impulseMagnitude);

  // Apply to bots via worker
  const botId1 = botRefToId.get(mesh1);
  const botId2 = botRefToId.get(mesh2);

  if (botId1 !== undefined) {
    triggerImpulseFromMain(botId1, impulseVector.toArray() as [number, number, number]);
  }

  if (botId2 !== undefined) {
    // Flip the impulse for the other bot
    triggerImpulseFromMain(
      botId2,
      impulseVector.clone().multiplyScalar(-1).toArray() as [number, number, number],
    );
  }

  if (!botId1 && mesh1.userData.impulseVelocity) {
    mesh1.userData.impulseVelocity.add(impulseVector.clone());
  }
  if (!botId2 && mesh2.userData.impulseVelocity) {
    mesh2.userData.impulseVelocity.add(impulseVector.clone().multiplyScalar(-1));
  }
};

export const onShipCollision = (mesh1: THREE.Object3D, mesh2: THREE.Object3D) => {
  // Check if both meshes have a velocity vector
  if (!mesh1.userData.velocity || !mesh2.userData.velocity) {
    return;
  }
  const velocity2 = mesh2.userData.velocity;

  // Get the positions of the two meshes
  const position1 = mesh1.position;
  const position2 = mesh2.position;

  // Calculate the vector from mesh2 to mesh1, which is the collision normal
  const collisionNormal = new THREE.Vector3().subVectors(position1, position2).normalize();

  // Calculate the relative velocity of the two objects
  const relativeVelocity = new THREE.Vector3().subVectors(mesh1.userData.velocity, velocity2);

  // Calculate the speed of impact by finding the component of the relative velocity
  // that is along the collision normal.
  const speedOfImpact = relativeVelocity.dot(collisionNormal);

  // If the objects are moving away from each other, there's no new collision
  if (speedOfImpact > 0) {
    return;
  }

  // A restitution value (e.g., 1.0 for a perfect bounce, 0.0 for no bounce)
  const restitution = 0.5;

  // Calculate the impulse magnitude. It's proportional to the speed of impact.
  const impulseMagnitude = -(1 + restitution) * speedOfImpact;

  // The impulse vector for each mesh
  const impulseVector = collisionNormal.clone().multiplyScalar(impulseMagnitude);

  mesh1.userData.impulseVelocity.add(impulseVector.clone().multiplyScalar(impulseMagnitude));
  mesh2.userData.impulseVelocity.add(impulseVector.clone().multiplyScalar(-impulseMagnitude));
};
