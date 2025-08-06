import { useEffect, useMemo, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { LitTerrainMaterial } from './LitTerrainMaterial';
import { ITerrainChunkProps } from '@/Constants';

extend({ LitTerrainMaterial });

const Terrain = forwardRef<THREE.Mesh, ITerrainChunkProps>(function Terrain(
  {
    worldOrigin = new THREE.Vector2(0, 0),
    position = new THREE.Vector3(0, 0, 0), //  Explicitly include position
    size = 500,
    segments = 128,
    maxHeight = 40,
    frequency = 0.015,
    amplitude = 1.0,
    octaves = 6.0,
    lacunarity = 2.0,
    persistence = 0.5,
    exponentiation = 1.0,
  },
  ref,
) {
  const materialRef = useRef<LitTerrainMaterial>(null);

  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);
    geom.computeVertexNormals();
    return geom;
  }, [size, segments]);

  useEffect(() => {
    if (!materialRef.current) return;
    const uniforms = materialRef.current.customUniforms;

    uniforms.uMaxHeight.value = maxHeight;
    uniforms.uFrequency.value = frequency;
    uniforms.uAmplitude.value = amplitude;
    uniforms.uOctaves.value = octaves;
    uniforms.uLacunarity.value = lacunarity;
    uniforms.uPersistence.value = persistence;
    uniforms.uExponentiation.value = exponentiation;

    //  Set correct shader offsets based on chunk's world position
    uniforms.uWorldOffset.value.set(position.x - worldOrigin.x, position.z - worldOrigin.y);
    uniforms.uWorldOrigin.value.set(worldOrigin.x, worldOrigin.y);
  }, [
    maxHeight,
    frequency,
    amplitude,
    octaves,
    lacunarity,
    persistence,
    exponentiation,
    position,
    worldOrigin,
  ]);

  return (
    <mesh
      ref={ref}
      position={[0, 0, 0]} //  Mesh remains local to its group
      castShadow
      receiveShadow
      geometry={geometry}
    >
      <litTerrainMaterial
        ref={materialRef}
        attach="material"
        side={THREE.FrontSide}
        metalness={0}
        roughness={0.8}
      />
    </mesh>
  );
});

export default Terrain;
