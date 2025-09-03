import { extend, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ShieldMaterial } from './ShieldMaterial';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import { ShieldSound } from '../Audio/ShieldSound';

extend({ ShieldMaterial });

export function Shield({
  shieldValue,
  target,
}: {
  shieldValue: number;
  target?: React.RefObject<THREE.Object3D>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<ShieldMaterial>(null);
  const { buffers, masterVolume, sfxVolume } = useAudioStore((s) => s);

  useFrame((state) => {
    if (target?.current && meshRef.current) {
      target.current.getWorldPosition(meshRef.current.position);
      target.current.getWorldQuaternion(meshRef.current.quaternion);
    }

    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      matRef.current.uniforms.uShieldValue.value = shieldValue;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} scale={[1.5, 0.8, 1.5]}>
        <sphereGeometry args={[1.8, 5, 5]} />
        <primitive ref={matRef} object={new ShieldMaterial()} />
        <ShieldSound
          buffer={buffers['shield']}
          volume={shieldValue * 10 * masterVolume * sfxVolume}
        />
      </mesh>
    </group>
  );
}
