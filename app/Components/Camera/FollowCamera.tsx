import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export default function FollowCamera({
  targetRef,
}: {
  targetRef: React.RefObject<THREE.Object3D | null>;
}) {
  const { camera } = useThree();

  // In front and slightly above
  const offset = new THREE.Vector3(0, 0.5, 10);

  useFrame(() => {
    const target = targetRef.current;
    if (!target) return;

    const targetPos = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();

    target.getWorldPosition(targetPos);
    target.getWorldQuaternion(targetQuat);

    // Offset relative to ship orientation
    const worldOffset = offset.clone().applyQuaternion(targetQuat);
    const desiredCameraPos = targetPos.clone().add(worldOffset);

    // Smooth position and orientation — keep full ship orientation (including roll)
    camera.position.lerp(desiredCameraPos, 0.5);
    camera.quaternion.slerp(targetQuat, 0.1);
  });

  return null;
}
