// particleWorker.ts
// This worker performs the heavy computation of updating particle positions
// and writes the results directly to a SharedArrayBuffer.

// Define global variables for the shared data arrays and other properties.
// These will be initialized once the worker receives the 'init' message.
let positions: Float32Array;
let offsets: Float32Array;
let progress: Float32Array;
let curveData: Float32Array;
let speed: number;
let maxParticles: number;

// Type definitions for the data expected in the messages from the main thread.
interface WorkerInitData {
  init: true;
  sharedPositions: SharedArrayBuffer;
  sharedOffsets: SharedArrayBuffer;
  sharedProgress: SharedArrayBuffer;
  curve: Float32Array;
  s: number;
  mP: number;
}

interface WorkerTickData {
  tick: true;
  delta: number;
}

// A simple interface for the point object returned by getPointOnCurve.
interface CurvePoint {
  x: number;
  y: number;
  z: number;
}

/**
 * A helper function to get a point on the pre-computed curve data.
 * This is a CPU-side lookup table, as a THREE.Curve object is not available here.
 * @param t A value between 0.0 and 1.0 representing progress along the curve.
 * @returns An object with the x, y, and z coordinates of the point.
 */
const getPointOnCurve = (t: number): CurvePoint => {
  // Ensure the progress value is clamped between 0 and 1.
  const clampedT = Math.max(0, Math.min(1, t));
  // Determine the index in the flat array based on the progress.
  const pointIndex = Math.floor(clampedT * (curveData.length / 3 - 1)) * 3;
  return {
    x: curveData[pointIndex],
    y: curveData[pointIndex + 1],
    z: curveData[pointIndex + 2],
  };
};

// The main message handler for the web worker.
onmessage = (e: MessageEvent) => {
  const data = e.data;
    console.log({ data })
  // Handle initialization message. This happens once on component mount.
  if ('init' in data) {
    const initData = data as WorkerInitData;
    positions = new Float32Array(initData.sharedPositions);
    offsets = new Float32Array(initData.sharedOffsets);
    progress = new Float32Array(initData.sharedProgress);
    curveData = initData.curve;
    speed = initData.s;
    maxParticles = initData.mP;
  }
  // Handle the "tick" message, sent on every animation frame.
  else if ('tick' in data) {
    const tickData = data as WorkerTickData;
    const { delta } = tickData;

    // The core animation loop. This runs on the worker thread.
    for (let i = 0; i < maxParticles; i++) {
      // Update the particle's progress and ensure it loops from 0 to 1.
      progress[i] = (progress[i] + delta * speed) % 1;

      // Get the new position on the curve based on the updated progress.
      const t = progress[i];
      const curvePoint = getPointOnCurve(t);

      // Retrieve the static offset for this particle.
      const offsetX = offsets[i * 3];
      const offsetY = offsets[i * 3 + 1];
      const offsetZ = offsets[i * 3 + 2];

      // Calculate the final position and write it directly to the shared buffer.
      positions[i * 3] = curvePoint.x + offsetX;
      positions[i * 3 + 1] = curvePoint.y + offsetY;
      positions[i * 3 + 2] = curvePoint.z + offsetZ;
    }

    console.log({ positions })
  }
};
