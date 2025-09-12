import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { LODPlanetWrapper } from '@/Components/LODTerrain/Planet/LODPlanetWrapper';

export default function WorldPlanet({
  ref,
  size = 350,
  position = new THREE.Vector3(0, 0, 0),
  texturePath = 'planet_texture01',
  cloudsPath = 'clouds',
  cloudRadius = 150,
  clouds = true,
  maxHeight = 200,
  frequency = 7,
  amplitude = 0.1,
  octaves = 2,
  lacunarity = 1.1,
  persistence = 0.7,
  exponentiation = 1,
}: {
  ref?: React.RefObject<THREE.Object3D>;
  size?: number;
  color?: string;
  position?: THREE.Vector3;
  emissiveIntensity?: number;
  texturePath?: string;
  cloudsPath?: string;
  cloudRadius?: number;
  emissive?: boolean;
  emissiveColor?: string;
  clouds?: boolean;
  maxHeight?: number;
  frequency?: number;
  amplitude?: number;
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
  exponentiation?: number;
}) {
  const planetRef = useRef<THREE.Object3D>(null!);
  const cloudRef = useRef<THREE.Object3D>(null!);

  const planetTexture = useTexture(`/textures/${texturePath}.png`);
  const cloudTexture = useTexture(`/textures/${cloudsPath}.png`);

  // Forward the mesh reference
  useImperativeHandle(ref, () => planetRef.current, []);

  // Configure planet texture
  useEffect(() => {
    planetTexture.wrapS = THREE.RepeatWrapping;
    planetTexture.wrapT = THREE.RepeatWrapping;
    planetTexture.repeat.set(10, 5);
    planetTexture.needsUpdate = true;
  }, [planetTexture]);

  useEffect(() => {
    if (!clouds) return;
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.RepeatWrapping;
    cloudTexture.repeat.set(5, 5);
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
      {/* Base planet */}
      <directionalLight
        position={[position.x + 100, position.y + 50, position.z + 100]}
        intensity={1.5}
        color="#fffde4"
        castShadow
      />
      <LODPlanetWrapper
        position={position}
        planetSize={size}
        cubeSize={16}
        lowTextPath="/textures/ruby_ground128.png"
        midTextPath="/textures/gold_ground128.png"
        highTextPath="/textures/molten_rock.png"
        maxHeight={maxHeight}
        frequency={frequency}
        amplitude={amplitude}
        octaves={octaves}
        lacunarity={lacunarity}
        persistence={persistence}
        exponentiation={exponentiation}
      />
      <mesh ref={planetRef} position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshStandardMaterial
          color={'orange'}
          transparent
          opacity={0.0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {clouds && (
        <>
          {/* Cloud layer */}
          <group ref={cloudRef} position={position}>
            <mesh>
              <sphereGeometry args={[size + cloudRadius, 64, 64]} /> {/* Slightly larger radius */}
              <meshStandardMaterial
                map={cloudTexture}
                transparent
                opacity={0.4}
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>

          {/* Atmosphere layer */}
          <mesh position={position}>
            <sphereGeometry args={[size + cloudRadius + cloudRadius * 0.1, 64, 64]} />
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
