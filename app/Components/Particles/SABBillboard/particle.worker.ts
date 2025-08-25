// particle.worker.ts
export type WorkerInitMsg = {
  sab: SharedArrayBuffer;
  numParticles: number; // Corrected from `count`
};

let positions!: Float32Array;
let sizes!: Float32Array;
let colors!: Float32Array;
let rotations!: Float32Array;
let count = 0;

// Simple time accumulator
let lastTime = performance.now();

self.onmessage = (e: MessageEvent) => {
  const data = e.data as WorkerInitMsg;

  if (data.sab) {
    count = data.numParticles;

    // Split the SAB into typed views
    let offset = 0;
    positions = new Float32Array(data.sab, offset, count * 3);
    offset += positions.byteLength;
    sizes = new Float32Array(data.sab, offset, count);
    offset += sizes.byteLength;
    colors = new Float32Array(data.sab, offset, count * 3);
    offset += colors.byteLength;
    rotations = new Float32Array(data.sab, offset, count);
    offset += rotations.byteLength;

    // Initialize particles with starting values
    for (let i = 0; i < count; i++) {
      // Give particles a random position within a box
      positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      // Give particles a random size between 0.1 and 0.5
      sizes[i] = 0.1 + Math.random() * 0.4;

      // Give particles a random color (e.g., shades of blue)
      colors[i * 3 + 0] = 0.5; // R
      colors[i * 3 + 1] = Math.random(); // G
      colors[i * 3 + 2] = 1.0; // B

      // Give particles a random starting rotation
      rotations[i] = Math.random() * Math.PI * 2;
    }

    console.log("Worker initialized. First particle position:", positions[0], positions[1], positions[2]);
    console.log("First particle size:", sizes[0]);

    // Start ticking
    setTimeout(tick, 10);
  }
};

function tick() {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  for (let i = 0; i < count; i++) {
    // Example motion: drift upward
    positions[i * 3 + 1] += dt * 0.5;

    // Wrap back when too high
    if (positions[i * 3 + 1] > 5) {
      positions[i * 3 + 1] = -5;
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    rotations[i] += dt; // spin slowly
  }

  requestAnimationFrame(tick);
}