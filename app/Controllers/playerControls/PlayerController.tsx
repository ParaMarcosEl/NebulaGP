import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBVH } from 'three-mesh-bvh';
import { useGameStore } from '@/Controllers/GameController';
import { BOT_SPEED, TOTAL_LAPS } from '@/Constants';
import { isMobileDevice } from '@/Utils';

// --- Shared input ref for touch joystick ---
// inputAxisRef stores the current x and y values from a touch joystick.
const inputAxisRef = { current: { x: 0, y: 0 } };
// throttleRef stores the current throttle value, likely for touch controls.
const throttleRef = { current: 0 };

// Optional external setter
// playerInputAxis provides a way for external components to set the touch joystick input.
export const playerInputAxis = {
  set: (axis: { x: number; y: number }) => {
    inputAxisRef.current = axis;
  },
};

// setThrottle provides a way for external components to set the throttle value.
export const setThrottle = (value: number) => {
  throttleRef.current = value;
};

// Defines the options that can be passed to the usePlayerController hook.
type PlayerSystemOptions = {
  aircraftRef: React.RefObject<THREE.Group | null>; // Reference to the 3D model of the aircraft.
  obstacleRefs?: React.RefObject<THREE.Mesh | null>[]; // Array of references to obstacle meshes.
  playingFieldRef?: React.RefObject<THREE.Mesh | null>; // Optional reference to the playing field mesh for collision detection.
  acceleration?: number; // Rate at which the aircraft accelerates.
  damping?: number; // Factor to reduce speed when not accelerating or braking (simulates drag).
  noiseAmplitude?: number; // Amplitude of the noise applied to bot movement (for subtle variations).
  noiseFrequency?: number; // Frequency of the noise applied to bot movement.
  curve: THREE.Curve<THREE.Vector3>; // A Three.js curve defining the bot's patrol path.
  onSpeedChange?: (speed: number) => void; // Callback function triggered when the aircraft's speed changes.
  onAcceleratingChange?: (state: boolean) => void; // Callback function triggered when the acceleration state changes.
  onBrakingChange?: (state: boolean) => void; // Callback function triggered when the braking state changes.
};

// usePlayerController is a custom React hook that manages the player's aircraft controls and behavior.
export function usePlayerController({
  aircraftRef,
  playingFieldRef,
  acceleration = 0.1,
  damping = 0.5,
  noiseAmplitude = 2,
  noiseFrequency = 2,
  curve,
  onSpeedChange,
  onAcceleratingChange,
  onBrakingChange,
}: PlayerSystemOptions) {
  // keys useRef stores the state of keyboard keys (pressed or not).
  const keys = useRef<Record<string, boolean>>({});
  // speedRef stores the current forward/backward speed of the aircraft.
  const speedRef = useRef(0);
  // velocity useRef stores the current 3D velocity vector of the aircraft.
  const velocity = useRef(new THREE.Vector3());
  // angularVelocity useRef stores the current rotational velocity of the aircraft.
  const angularVelocity = useRef(new THREE.Vector3());
  // previousInputState useRef tracks the previous accelerating and braking states to trigger callbacks only on change.
  const previousInputState = useRef({ accelerating: false, braking: false });
  // gamepadIndex useRef stores the index of the connected gamepad, if any.
  const gamepadIndex = useRef<number | null>(null);

  // Destructure playerId, raceData, and raceStatus from the global game store.
  const { playerId, raceData, raceStatus, playerSpeed } = useGameStore((state) => state);
  // controlsEnabled determines if player controls are active (only when raceStatus is 'racing').
  const controlsEnabled = raceStatus === 'racing';

  // t useRef is used to track the position along the curve for bot movement.
  const t = useRef(0);
  // clock useRef is used to get elapsed time for noise calculations in bot movement.
  const clock = useRef(new THREE.Clock());

  // useEffect for handling keyboard input (keydown and keyup events).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Cleanup event listeners on component unmount.
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty dependency array means this effect runs once on mount.

  // useEffect for handling gamepad connection.
  useEffect(() => {
    const handler = (e: GamepadEvent) => {
      // If no gamepad index is set, store the index of the first connected gamepad.
      if (gamepadIndex.current === null) {
        gamepadIndex.current = e.gamepad.index;
      }
    };
    window.addEventListener('gamepadconnected', handler);
    // Cleanup event listener on component unmount.
    return () => window.removeEventListener('gamepadconnected', handler);
  }, []); // Empty dependency array means this effect runs once on mount.

  // useFrame is a hook from @react-three/fiber that runs every frame, similar to a game loop.
  useFrame((state, delta) => {
    const ship = aircraftRef.current;
    // If controls are not enabled or the aircraft model is not available, do nothing.
    if (!controlsEnabled || !ship) return;

    // Check if the current player has completed all laps. If so, the aircraft becomes a bot.
    if ((raceData[playerId]?.history?.length || 0) >= TOTAL_LAPS) {
      let time = clock.current.elapsedTime;
      const bot = ship;
      time += delta;
      t.current = (t.current + BOT_SPEED) % 1;

      const pos = curve.getPointAt(t.current);
      const tangent = curve.getTangentAt(t.current).normalize();

      // Get a side vector perpendicular to the tangent (right-hand rule)
      const up = new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Compute oscillating offset
      const offset = side.multiplyScalar(Math.sin(time * noiseFrequency) * noiseAmplitude);
      const noisyPos = pos.clone().add(offset);

      // Update bot position and rotation
      bot.position.copy(noisyPos);
      bot.lookAt(pos.clone().add(tangent));

      bot.userData.curvePosition = pos.clone(); // raw on-curve position
      bot.userData.progress = t;

      bot.rotateX(3);
      bot.rotateY(Math.PI / 2);
      // bot.rotateZ(Math.PI/2);
      bot.rotateX(8);
      bot.rotateY(-Math.PI / 2);
      bot.rotateZ(-Math.PI / 2);
    } else {
      // Player control logic
      const throttle = throttleRef.current; // Throttle input from touch screens.
      const DEAD_ZONE = 0.1; // Dead zone for gamepad analog sticks.
      const gamepads = navigator.getGamepads?.();
      // Get the connected gamepad, preferring the one with a stored index or the first available.
      const gp = gamepadIndex.current !== null ? gamepads?.[gamepadIndex.current] : gamepads?.[0];
      let lx = 0, // Left stick X-axis value.
        ly = 0; // Left stick Y-axis value.

      const { x: touchX, y: touchY } = inputAxisRef.current;

      // Handle touch joystick input for angular velocity.
      if (Math.abs(touchX) > 0.01 || Math.abs(touchY) > 0.01) {
        angularVelocity.current.z += touchX * -0.03; // Yaw (left/right rotation)
        angularVelocity.current.x += touchY * 0.01; // Pitch (up/down rotation)
      } else {
        // Handle gamepad input for angular velocity.
        if (gp && gp.connected) {
          lx = Math.abs(gp.axes[0]) > DEAD_ZONE ? gp.axes[0] : 0;
          ly = Math.abs(gp.axes[1]) > DEAD_ZONE ? gp.axes[1] : 0;
        }
        angularVelocity.current.z += lx * -0.03;
        angularVelocity.current.x += ly * 0.01;

        // Handle keyboard input for angular velocity.
        if (keys.current['a']) angularVelocity.current.z += 0.03;
        if (keys.current['d']) angularVelocity.current.z -= 0.03;
        if (keys.current['w']) angularVelocity.current.x -= 0.01;
        if (keys.current['s']) angularVelocity.current.x += 0.01;
      }

      // Determine accelerating and braking states based on keyboard, gamepad, and throttle input.
      const accelerating = !!(keys.current['i'] || gp?.buttons?.[0]?.pressed || throttle > 0);
      const braking = !!(keys.current['k'] || gp?.buttons?.[2]?.pressed || throttle < 0);

      // Trigger onAcceleratingChange callback if the accelerating state has changed.
      if (accelerating !== previousInputState.current.accelerating) {
        onAcceleratingChange?.(accelerating);
        previousInputState.current.accelerating = accelerating;
      }
      // Trigger onBrakingChange callback if the braking state has changed.
      if (braking !== previousInputState.current.braking) {
        onBrakingChange?.(braking);
        previousInputState.current.braking = braking;
      }

      // Forward motion
      if (accelerating || throttle > 0) {
        // Accelerate up to playerSpeed, adjusting for mobile throttle input.
        speedRef.current = Math.min(
          playerSpeed,
          isMobileDevice()
            ? (speedRef.current + acceleration) * Math.abs(throttle)
            : speedRef.current + acceleration,
        );
      } else if (!braking) {
        // Apply damping (slow down) when not accelerating or braking.
        speedRef.current *= damping;
      }

      // Braking motion
      if (braking || throttle < 0) {
        // Brake, adjusting for mobile throttle input, down to a minimum speed of -1 (reverse).
        speedRef.current = Math.max(
          -1,
          isMobileDevice()
            ? speedRef.current - acceleration * 2 * Math.abs(throttle)
            : speedRef.current - acceleration * 2,
        );
      }

      // If speed is very close to zero, set it to zero and clear velocity to prevent tiny movements.
      if (Math.abs(speedRef.current) < 0.001) {
        speedRef.current = 0;
        velocity.current.set(0, 0, 0);
      }

      // Call the onSpeedChange callback with the current speed.
      onSpeedChange?.(speedRef.current);

      // Apply angular velocity to the ship's rotation.
      const deltaRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          angularVelocity.current.x,
          angularVelocity.current.y,
          angularVelocity.current.z,
          'XYZ', // Order of rotation
        ),
      );
      ship.quaternion.multiply(deltaRotation);
      // Dampen angular velocity over time.
      angularVelocity.current.multiplyScalar(0.5);

      // Calculate forward direction based on ship's current rotation.
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion).normalize();
      // Calculate desired velocity based on forward direction and speed.
      const desiredVelocity = forward.multiplyScalar(speedRef.current);
      // Lerp (linear interpolate) the current velocity towards the desired velocity for smooth movement.
      const lerpFactor = Math.max(0.05, Math.min(1, Math.abs(speedRef.current)));
      velocity.current.lerp(desiredVelocity, lerpFactor);
      // Update ship position based on current velocity.
      ship.position.add(velocity.current);

      // Playing field collision detection and correction.
      if (playingFieldRef?.current) {
        const field = playingFieldRef.current;
        const geometry = field.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
        // If the geometry doesn't have a BVH (Bounding Volume Hierarchy), create one for efficient raycasting.
        if (!geometry.boundsTree) geometry.boundsTree = new MeshBVH(geometry);
        const raycaster = new THREE.Raycaster();
        // Cast a ray downwards from above the ship to check for ground.
        raycaster.ray.origin.copy(ship.position).add(new THREE.Vector3(0, 1000, 0));
        raycaster.ray.direction.set(0, -1, 0);
        raycaster.firstHitOnly = false;
        const hits = raycaster.intersectObject(field);
        // If no hits, the ship is likely outside the playing field or very high up.
        if (hits.length === 0) {
          const hitInfo = { point: new THREE.Vector3(), distance: 0, faceIndex: -1 };
          // Find the closest point on the playing field's BVH to the ship's position.
          if (geometry.boundsTree.closestPointToPoint(ship.position, hitInfo)) {
            const dist = ship.position.distanceTo(hitInfo.point);
            // If the distance to the closest point is greater than 10 (meaning it's far off),
            // snap the ship back to the closest point and reverse/stop its velocity.
            if (dist > 10) {
              ship.position.copy(hitInfo.point);
              velocity.current.multiplyScalar(-1); // Reverse velocity.
              speedRef.current = 0; // Stop movement.
            }
          }
        }
      }

      // Obstacle collision detection.
      // const shipBox = new THREE.Box3().setFromObject(ship); // Get bounding box of the ship.

      // for (const obsRef of obstacleRefs as RefObject<THREE.Mesh>[]) {
      //   const obs = obsRef.current;
      //   if (!obs) continue;
      //   const obsBox = new THREE.Box3().setFromObject(obs); // Get bounding box of the obstacle.
      //   // Check for intersection between ship and obstacle bounding boxes.
      //   if (shipBox.intersectsBox(obsBox)) {
      //     velocity.current.multiplyScalar(-3); // Drastically reverse velocity on collision.
      //     speedRef.current = 0; // Stop movement immediately.
      //     break; // Stop checking further obstacles after a collision.
      //   }
      // }
    }
  });
}
