import * as THREE from 'three';

export const onBulletCollision = (mesh2: THREE.Object3D) => {
  // Check if both meshes have a velocity vector
  if (!mesh2.userData.velocity) {
    return;
  }

  // A restitution value (e.g., 1.0 for a  bounce, 0.0 for no bounce)
  const restitution = 0.2;

  // Calculate the impulse magnitude
  const impulseMagnitude = -(1 + restitution);

  // The impulse vector for each mesh
  const impulseVector = mesh2.userData.velocity.clone().multiplyScalar(impulseMagnitude);

  mesh2.userData.impulseVelocity.add(impulseVector.clone().multiplyScalar(-impulseMagnitude));
};
