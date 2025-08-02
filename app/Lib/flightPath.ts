// lib/FlightPath.ts
import * as THREE from 'three'; // Import the Three.js library for 3D operations.
import { NUM_POINTS, LAP_RADIUS, SEED, HEIGHT_VARIATION, TUBE_RADIUS } from '@/Constants'; // Import constants from a relative path.

// Constants specific to the spiral/spring segment in Track 3
const SPRING_RADIUS = 60; // The radius of the spiral's curvature.
const SPRING_TURNS = 3; // The number of full turns the spiral segment makes.
const SPRING_SEGMENT_RATIO = 0.5; // The proportion of the total track points dedicated to the spiral segment.

// Controls for vertical noise on "Side 4" of Track 3
const SIDE4_FREQUENCY = 0.25; // The frequency of the sinusoidal vertical noise.
const SIDE4_PHASE = SEED + 100; // A phase offset for the noise, ensuring it's different from other noise patterns (e.g., using SEED for variety).
const SIDE4_HEIGHT_VARIATION = HEIGHT_VARIATION * 0.8; // The amplitude of the vertical noise, slightly less pronounced than the general HEIGHT_VARIATION.

/**
 * Generates points for a circular track with smooth vertical variations.
 * @param num_pts - Optional. The number of points to generate for the track. Defaults to NUM_POINTS.
 * @returns An array of THREE.Vector3 points defining the track.
 */
function generateTrack1(num_pts?: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []; // Initialize an empty array to store the track points.
  const pointCount = num_pts || NUM_POINTS; // Use provided num_pts or default NUM_POINTS.

  // Loop to generate each point
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2; // Calculate angle for even distribution around a circle (0 to 2*PI).

    // Calculate X and Z coordinates for a circle in the XZ plane.
    const x = Math.cos(angle) * LAP_RADIUS;
    const z = Math.sin(angle) * LAP_RADIUS;

    // Add smooth vertical variation (sinusoidal wave) to the Y coordinate.
    // The `i * 0.5 + 80000` creates a unique phase for the sine wave.
    const y = Math.sin(i * 0.5 + 80000) * 130;

    points.push(new THREE.Vector3(x, y, z)); // Add the 3D point to the array.
  }

  return points; // Return the array of generated points.
}

/**
 * Generates points for a figure-eight shaped track with vertical undulations
 * and an added lift at the crossover point to prevent overlap.
 * @param num_pts - Optional. The number of points to generate for the track. Defaults to NUM_POINTS.
 * @returns An array of THREE.Vector3 points defining the track.
 */
function generateTrack2(num_pts?: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []; // Initialize an empty array.
  const pointCount = num_pts || NUM_POINTS; // Use provided num_pts or default NUM_POINTS.

  // Minimum vertical distance to maintain at the track's crossover point
  const MIN_CROSSOVER_SEPARATION = TUBE_RADIUS * 20; // Ensures enough space for a tube geometry.

  // Phase shift to align the origin (t=0) of the figure-eight with a straight segment.
  // This can make the track's starting point more aesthetically pleasing or functional.
  const phaseShift = Math.PI / 2;

  // Loop to generate each point
  for (let i = 0; i < pointCount; i++) {
    // Calculate parameter 't' for the figure-eight, adjusted by phaseShift.
    const t = (i / pointCount) * Math.PI * 2 + phaseShift;

    // Base 2D figure-8 shape in the XZ plane using parametric equations.
    const x = Math.sin(t) * LAP_RADIUS;
    const z = Math.sin(t) * Math.cos(t) * LAP_RADIUS; // This creates the figure-eight pattern.

    // General sinusoidal vertical variation applied to the Y coordinate.
    const waveY = Math.sin(i * 0.5 + 8000) * HEIGHT_VARIATION;

    // Extra vertical lift at the crossover points of the figure-eight.
    // `Math.abs(Math.sin(t))` is close to 1 at the crossover, providing maximum boost.
    const crossBoost = Math.abs(Math.sin(t)) * MIN_CROSSOVER_SEPARATION;

    // Combine general vertical variation with the crossover boost for the final Y.
    const y = waveY + crossBoost;

    points.push(new THREE.Vector3(x, y, z)); // Add the point.
  }

  return points; // Return the array of points.
}

/**
 * Generates points for a square-like track with one side featuring a spiral/spring
 * and other sides having varying vertical noise patterns.
 * @param num_pts - The number of points to generate for the track. Defaults to NUM_POINTS.
 * @returns An array of THREE.Vector3 points defining the track.
 */
function generateTrack3(num_pts = NUM_POINTS): THREE.Vector3[] {
  const points: THREE.Vector3[] = []; // Initialize an empty array.

  const totalPoints = num_pts;
  // Calculate the number of points for each segment type based on ratios.
  const spiralPoints = Math.floor(totalPoints * SPRING_SEGMENT_RATIO);
  // Distribute remaining points evenly among the three "straight" sides.
  const sidePoints = Math.floor((totalPoints - spiralPoints) / 3);

  const radius = LAP_RADIUS; // Use LAP_RADIUS for the overall size of the square.

  // Define the four corner points of the square in the XZ plane.
  const bottomLeft = new THREE.Vector3(-radius, 0, -radius);
  const topLeft = new THREE.Vector3(-radius, 0, radius);
  const topRight = new THREE.Vector3(radius, 0, radius);
  const bottomRight = new THREE.Vector3(radius, 0, -radius);

  // --- Side 1: From bottom-left to top-left (a straight segment)
  for (let i = 0; i < sidePoints; i++) {
    const t = i / sidePoints; // Parameter 't' from 0 to 1 for linear interpolation.
    // Linearly interpolate between the two corner points.
    points.push(new THREE.Vector3().lerpVectors(bottomLeft, topLeft, t));
  }

  // --- Side 2: Spiral segment from top-left to top-right
  {
    // Block scope for variables used only in this section.
    // Calculate the direction vector of the segment's center line.
    const direction = new THREE.Vector3().subVectors(topRight, topLeft);
    const tangent = direction.clone().normalize(); // Normalized tangent along the segment.

    const up = new THREE.Vector3(0, 1, 0); // Define the global 'up' direction.
    // Calculate the normal vector, perpendicular to 'up' and 'tangent'.
    const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();
    // Calculate the binormal vector, perpendicular to 'tangent' and 'normal', completing the local coordinate system.
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

    // Loop to generate points for the spiral.
    for (let i = 0; i < spiralPoints; i++) {
      const t = i / spiralPoints; // Parameter 't' for interpolation along the segment and spiral turns.
      // Calculate the current center point along the straight line between topLeft and topRight.
      const center = new THREE.Vector3().lerpVectors(topLeft, topRight, t);
      // Calculate the angle for the spiral, increasing with 't' and number of turns.
      const angle = t * SPRING_TURNS * Math.PI * 2;

      // Calculate the radial offset from the center point using cosine and sine,
      // multiplied by SPRING_RADIUS and rotated by the normal and binormal vectors.
      const radialOffset = normal
        .clone()
        .multiplyScalar(Math.cos(angle) * SPRING_RADIUS)
        .add(binormal.clone().multiplyScalar(Math.sin(angle) * SPRING_RADIUS));

      // Add the radial offset to the center point to get the spiral point.
      const spiralPoint = center.clone().add(radialOffset);
      points.push(spiralPoint); // Add the spiral point.
    }
  }

  // --- Side 3: From top-right to bottom-right (straight with sinusoidal height variation)
  for (let i = 0; i < sidePoints; i++) {
    const t = i / sidePoints;
    // Calculate the base point for the straight segment.
    const base = new THREE.Vector3().lerpVectors(topRight, bottomRight, t);
    const frequency = 0.3; // Local frequency for this side's vertical variation.

    // Add smooth sinusoidal height variation to the Y coordinate.
    // SEED provides a reproducible offset for the sine wave.
    const yOffset = Math.sin(i * frequency + SEED) * HEIGHT_VARIATION;

    base.y += yOffset; // Apply the vertical offset.
    points.push(base); // Add the modified point.
  }

  // --- Side 4: From bottom-right to bottom-left (straight with specific vertical noise)
  // Using `<=` to ensure the last point connects properly, potentially overlapping with the first point of Side 1 for closure.
  for (let i = 0; i <= sidePoints; i++) {
    const t = i / sidePoints;
    // Calculate the base point for this straight segment.
    const base = new THREE.Vector3().lerpVectors(bottomRight, bottomLeft, t);

    // Apply specific vertical noise using SIDE4_FREQUENCY, SIDE4_PHASE, and SIDE4_HEIGHT_VARIATION.
    const yOffset = Math.sin(i * SIDE4_FREQUENCY + SIDE4_PHASE) * SIDE4_HEIGHT_VARIATION;
    base.y += yOffset; // Apply the vertical offset.

    points.push(base); // Add the modified point.
  }

  return points; // Return the array of points for the complete track.
}

// Export a closed CatmullRomCurve3
// The following line is commented out, but shows how a single curve could be exported.
// export const spiralSquareCurve = new THREE.CatmullRomCurve3(generateSquareWithSpiralSide(), true);

// Procedurally generated smooth closed paths using Catmull-Rom splines.
// CatmullRomCurve3 takes an array of Vector3 points and interpolates smoothly between them.
// The 'true' argument indicates that the curve should be closed (the end connects to the start).
const track1 = new THREE.CatmullRomCurve3(generateTrack1(), true);
const track2 = new THREE.CatmullRomCurve3(generateTrack2(), true);
const track3 = new THREE.CatmullRomCurve3(generateTrack3(), true);

// Export an array containing all generated track curves.
// This allows other modules to easily access different track designs.
export const tracks = [track1, track2, track3];
