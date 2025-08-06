import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBVH } from 'three-mesh-bvh';
import { useGameStore } from '@/Controllers/Game/GameController';
import { isMobileDevice } from '@/Utils';
import { useBotController } from '@/Components/Player/BotController';

// --- Shared input ref for touch joystick ---
const inputAxisRef = { current: { x: 0, y: 0 } };
const throttleRef = { current: 0 };

export const playerInputAxis = {
  set: (axis: { x: number; y: number }) => {
    inputAxisRef.current = axis;
  },
};

export const setThrottle = (value: number) => {
  throttleRef.current = value;
};

type PlayerSystemOptions = {
  aircraftRef: React.RefObject<THREE.Group | null>; // Reference to the 3D model of the aircraft.
  obstacleRefs?: React.RefObject<THREE.Mesh | null>[]; // Array of references to obstacle meshes.
  playingFieldRef?: React.RefObject<THREE.Mesh | null>; // Optional reference to the playing field mesh for collision detection.
  acceleration?: number; // Rate at which the aircraft accelerates.
  damping?: number; // Factor to reduce speed when not accelerating or braking (simulates drag).
  noiseAmplitude?: number; // Amplitude of the noise applied to bot movement (for subtle variations).
  noiseFrequency?: number; // Frequency of the noise applied to bot movement.
  botSpeed: number;
  curve: THREE.Curve<THREE.Vector3>; // A Three.js curve defining the bot's patrol path.
  onSpeedChange?: (speed: number) => void; // Callback function triggered when the aircraft's speed changes.
  onAcceleratingChange?: (state: boolean) => void; // Callback function triggered when the acceleration state changes.
  onBrakingChange?: (state: boolean) => void; // Callback function triggered when the braking state changes.
};

export function usePlayerController({
  aircraftRef,
  playingFieldRef,
  acceleration = 0.1,
  damping = 0.5,
  botSpeed,
  curve,
  onSpeedChange,
  onAcceleratingChange,
  onBrakingChange,
}: PlayerSystemOptions) {
  const keys = useRef<Record<string, boolean>>({});
  const speedRef = useRef(0);
  const velocity = useRef(new THREE.Vector3());
  const angularVelocity = useRef(new THREE.Vector3());
  const previousInputState = useRef({ accelerating: false, braking: false });
  const gamepadIndex = useRef<number | null>(null);

  const { raceStatus, playerSpeed } = useGameStore((state) => state);
  const controlsEnabled = raceStatus === 'racing';

  useBotController({
    enabled: !controlsEnabled,
    botRef: aircraftRef,
    curve,
    speed: botSpeed,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handler = (e: GamepadEvent) => {
      if (gamepadIndex.current === null) {
        gamepadIndex.current = e.gamepad.index;
      }
    };
    window.addEventListener('gamepadconnected', handler);
    return () => window.removeEventListener('gamepadconnected', handler);
  }, []);

  useFrame(() => {
    const ship = aircraftRef.current;
    if (!controlsEnabled || !ship) return;

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
  });
}
