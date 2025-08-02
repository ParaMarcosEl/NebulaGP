import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export default function FollowCamera({
  targetRef,
}: {
  targetRef: React.RefObject<THREE.Object3D | null>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const target = targetRef.current;
    if (!target) return;

    const offset = new THREE.Vector3(0, 0, 8).applyQuaternion(target.quaternion);
    const desiredPosition = target.position.clone().add(offset);

    // Smooth camera position
    camera.position.lerp(desiredPosition, 0.2);

    camera.quaternion.slerp(target.quaternion, 0.1);
  });

  return null;
}

export { FollowCamera };
