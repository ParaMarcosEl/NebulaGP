import * as THREE from 'three';

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
  // Apply the impulse to the velocities
  // mesh1 gets an impulse away from mesh2
  // velocity1.add(impulseVector);
  // mesh1.userData.velocity.add(impulseVector);
  // mesh2.userData.velocity.sub(impulseVector);
};
