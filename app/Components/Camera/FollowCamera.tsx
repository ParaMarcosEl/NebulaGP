import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export default function FollowCamera({
  targetRef,
}: {
  targetRef: React.RefObject<THREE.Object3D | null>;
}) {
  const { camera } = useThree();

useFrame((_, delta) => {
  const target = targetRef.current;
  if (!target) return;

  // Target rotation & position
  const targetQuat = target.getWorldQuaternion(new THREE.Quaternion());
  const offset = new THREE.Vector3(0, 0, 8).applyQuaternion(targetQuat);
  const desiredPosition = target.position.clone().add(offset);

  // --- Time-based smoothing
  // positionLag and rotationLag represent the "half-life" in seconds:
  // the smaller the value, the snappier the camera
  const positionLag = 0.1; // 0.1s to cover ~63% of the distance
  const rotationLag = 0.05;

  // Exponential smoothing formula
  const positionAlpha = 1 - Math.exp(-delta / positionLag);
  const rotationAlpha = 1 - Math.exp(-delta / rotationLag);

  camera.position.lerp(desiredPosition, positionAlpha);
  camera.quaternion.slerp(targetQuat, rotationAlpha);
});


  return null;
}

export { FollowCamera };