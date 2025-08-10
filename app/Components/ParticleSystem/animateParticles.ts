import * as THREE from 'three';

// Particle state storage
let positions: Float32Array;
let velocities: Float32Array;
const tempVec = new THREE.Vector3();

export function initParticles(particleCount: number, speed: number) {
  positions = new Float32Array(particleCount * 3);
  velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    // Random start position
    positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

    // Random start velocity
    tempVec
      .set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      .normalize()
      .multiplyScalar(speed + Math.random() * speed);

    velocities[i * 3 + 0] = tempVec.x;
    velocities[i * 3 + 1] = tempVec.y;
    velocities[i * 3 + 2] = tempVec.z;
  }
}

export function animateParticles(delta: number, bounds: number) {
  for (let i = 0; i < positions.length / 3; i++) {
    // Update position
    positions[i * 3 + 0] += velocities[i * 3 + 0] * delta;
    positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
    positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

    // Simple bounds check — reflect if out of range
    if (Math.abs(positions[i * 3 + 0]) > bounds) velocities[i * 3 + 0] *= -1;
    if (Math.abs(positions[i * 3 + 1]) > bounds) velocities[i * 3 + 1] *= -1;
    if (Math.abs(positions[i * 3 + 2]) > bounds) velocities[i * 3 + 2] *= -1;
  }
}

export function getPositions() {
  return positions;
}
