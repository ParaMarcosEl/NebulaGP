'use client';
import * as THREE from 'three';

export type PadType = 'speed' | 'cannon' | 'mine' | 'shield';

type PadProps = {
  type: PadType;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  playerRefs: { id: number; ref: React.RefObject<THREE.Object3D> }[];
  meshRef: React.RefObject<THREE.Mesh>;
};

export default function Pad({
  type,
  position,
  quaternion,
  meshRef
}: PadProps) {
  // Choose pad visuals based on type
  const padConfig = {
    speed: {
      color: 'deepskyblue',
      emissive: 'cyan',
      size: [5, 2, 5],
      opacity: 0.7,
    },
    cannon: {
      color: 'orange',
      emissive: 'gold',
      size: [6, 2, 6],
      opacity: 0.8,
    },
    mine: {
      color: 'crimson',
      emissive: 'darkred',
      size: [4, 4, 4],
      opacity: 0.6,
    },
    shield: {
      color: 'limegreen',
      emissive: 'green',
      size: [6, 2, 6],
      opacity: 0.75,
    },
  }[type];

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion}>
      <cylinderGeometry args={[padConfig.size[0], padConfig.size[2], padConfig.size[1], 16]} />
      <meshStandardMaterial
        color={padConfig.color}
        emissive={padConfig.emissive}
        emissiveIntensity={1.5}
        transparent
        opacity={padConfig.opacity}
      />
    </mesh>
  );
}
