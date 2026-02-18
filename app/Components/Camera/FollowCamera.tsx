import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * FollowCamera applies a smooth, exponential lag to follow the target.
 * This is necessary if the target itself is snapping (due to network correction)
 * or if a desirable "floaty" cinematic feel is desired.
 */
export default function FollowCamera({
  targetRef,
}: {
  targetRef: React.RefObject<THREE.Object3D | null>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => { // Must capture delta for time-based smoothing
    const target = targetRef.current;
    if (!target) return;

    // Target rotation & position
    const targetQuat = target.getWorldQuaternion(new THREE.Quaternion());

    // Define the camera offset (8 units back) relative to the target's rotation
    const offset = new THREE.Vector3(0, 0, 8).applyQuaternion(targetQuat);
    const desiredPosition = target.position.clone().add(offset);

    // --- Time-based smoothing ---
    // positionLag and rotationLag represent the "half-life" in seconds:
    // the smaller the value, the snappier the camera.
    // We re-introducing these values to remove the sudden "snap."
    const positionLag = 0.15; // Increased slightly for more noticeable smoothness
    const rotationLag = 0.1;

    // Exponential smoothing alpha calculation, using delta time
    const positionAlpha = 1 - Math.exp(-delta / positionLag);
    const rotationAlpha = 1 - Math.exp(-delta / rotationLag);

    // 1. Position: Smoothly move the camera towards the desired position
    camera.position.lerp(desiredPosition, positionAlpha);

    // 2. Rotation: Smoothly rotate the camera towards the target's rotation
    camera.quaternion.slerp(targetQuat, rotationAlpha);
  });

  return null;
}

export { FollowCamera };
