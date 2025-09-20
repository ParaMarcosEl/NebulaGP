import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useFixedFrame } from '@/Controllers/Game/useFixedFrame';
export default function FollowCamera({
  targetRef,
}: {
  targetRef: React.RefObject<THREE.Object3D | null>;
}) {
  const { camera } = useThree();

  // Camera offset relative to target orientation
  const offset = new THREE.Vector3(0, 0.5, 10);

  // Scratch objects (avoid GC churn)
  const targetPos = new THREE.Vector3();
  const targetQuat = new THREE.Quaternion();
  const desiredPos = new THREE.Vector3();
  const worldOffset = new THREE.Vector3();

  useFixedFrame((dt, alpha) => {
    const target = targetRef.current;
    if (!target) return;

    // Grab target world transform
    target.getWorldPosition(targetPos);
    target.getWorldQuaternion(targetQuat);

    // Compute desired position based on offset
    worldOffset.copy(offset).applyQuaternion(targetQuat);
    desiredPos.copy(targetPos).add(worldOffset);

    // Interpolate camera using alpha (between last + current sim step)
    camera.position.lerpVectors(camera.position, desiredPos, alpha * 8);
    camera.quaternion.slerp(targetQuat, alpha * 5);
  });

  return null;
}
