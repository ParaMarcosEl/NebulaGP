import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Planet({
  ref,
  size = 500,
  color = 'white',
  position = new THREE.Vector3(0, 0, 0),
  emissiveIntensity = 1.5,
  texturePath = 'planet_texture01',
  cloudsPath = 'clouds',
  emissive = false,
  emissiveColor = 'white',
  clouds = true,
}: {
  ref?: React.RefObject<THREE.Mesh>;
  size?: number;
  color?: string;
  position?: THREE.Vector3;
  emissiveIntensity?: number;
  texturePath?: string;
  cloudsPath?: string;
  emissive?: boolean;
  emissiveColor?: string;
  clouds?: boolean;
}) {
  const planetRef = useRef<THREE.Mesh>(null!);
  const cloudRef = useRef<THREE.Mesh>(null!);

  const planetTexture = useTexture(`/textures/${texturePath}.png`);
  const cloudTexture = useTexture(`/textures/${cloudsPath}.png`);

  // Forward the mesh reference
  useImperativeHandle(ref, () => planetRef.current, []);

  // Configure planet texture
  useEffect(() => {
    planetTexture.wrapS = THREE.RepeatWrapping;
    planetTexture.wrapT = THREE.RepeatWrapping;
    planetTexture.repeat.set(10, 1);
    planetTexture.needsUpdate = true;
  }, [planetTexture]);

  useEffect(() => {
    if (!clouds) return;
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.RepeatWrapping;
    cloudTexture.repeat.set(10, 1);
    cloudTexture.anisotropy = 16;
    cloudTexture.needsUpdate = true;
  }, [cloudTexture, clouds]);

  // Animate slow rotation
  useFrame(() => {
    planetRef.current.rotation.y += 0.0005;
    if (clouds) cloudRef.current.rotation.y -= 0.0008; // Slightly faster for parallax effect
  });

  return (
    <>
      <directionalLight
        position={[position.x + 100, position.y + 50, position.z + 100]}
        intensity={1.5}
        color="#fffde4"
        castShadow
      />
      {/* Base planet */}
      <mesh ref={planetRef} position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshStandardMaterial
          map={planetTexture}
          color={color}
          {...(emissive && {
            emissivIntensity: emissiveIntensity,
            emissiveMap: planetTexture,
            emissive: emissiveColor,
          })}
        />
      </mesh>
      {clouds && (
        <>
          {/* Cloud layer */}
          <mesh ref={cloudRef} position={position}>
            <sphereGeometry args={[size + 150, 64, 64]} /> {/* Slightly larger radius */}
            <meshStandardMaterial
              map={cloudTexture}
              transparent
              opacity={0.4}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Atmosphere layer */}
          <mesh position={position}>
            <sphereGeometry args={[size + 160, 64, 64]} />
            <meshBasicMaterial
              color="#6ec6ff"
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </>
  );
}
