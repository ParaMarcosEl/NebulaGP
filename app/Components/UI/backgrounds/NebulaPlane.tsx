import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo } from 'react';

export function NebulaPlane({ texture }: { texture: THREE.Texture }) {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;

  // Distance from camera to place the plane
  const distance = -50;

  const scale = useMemo(() => {
    const fov = cam.fov * (Math.PI / 180); // Convert FOV to radians
    const height = 2 * Math.tan(fov / 2) * Math.abs(distance); // visible height
    const width = height * cam.aspect; // visible width
    return [width, height];
  }, [cam.aspect, cam.fov, distance]);

  return (
    <mesh position={[0, 0, distance]}>
      <planeGeometry args={[scale[0], scale[1]]} />
      <meshBasicMaterial map={texture} transparent opacity={0.5} />
    </mesh>
  );
}
