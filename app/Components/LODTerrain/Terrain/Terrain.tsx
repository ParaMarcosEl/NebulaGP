import { useEffect, useMemo, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { LitTerrainMaterial } from './LitTerrainMaterial';
import { ITerrainChunkProps, Y_OFFSET, TERRAIN_PROPS } from '@/Constants';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useTexture } from '@react-three/drei';

extend({ LitTerrainMaterial });

const Terrain = forwardRef<THREE.Mesh, ITerrainChunkProps>(function Terrain(
  {
    worldOrigin = new THREE.Vector2(0, 0),
    position = new THREE.Vector3(0, Y_OFFSET, 0),
    size = TERRAIN_PROPS.size,
    segments = TERRAIN_PROPS.segments,
    maxHeight = TERRAIN_PROPS.maxHeight,
    frequency = TERRAIN_PROPS.frequency,
    amplitude = TERRAIN_PROPS.amplitude,
    octaves = TERRAIN_PROPS.octaves,
    lacunarity = TERRAIN_PROPS.lacunarity,
    persistence = TERRAIN_PROPS.persistence,
    exponentiation = TERRAIN_PROPS.exponentiation,
    midMapPath = TERRAIN_PROPS.midMapPath,
    highMapPath = TERRAIN_PROPS.highMapPath,
    lowMapPath = TERRAIN_PROPS.lowMapPath,
  },
  ref,
) {
  const materialRef = useRef<LitTerrainMaterial>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const setLitTerrainMaterialLoaded = useGameStore((state) => state.setLitTerrainMaterialLoaded);
  const [midTexture, lowTexture, highTexture] = useTexture([lowMapPath, midMapPath, highMapPath]);

  [midTexture, lowTexture, highTexture].forEach((tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    // tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // only works if you have access
    tex.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);
    geom.computeVertexNormals();
    geometryRef.current = geom;
    return geom;
  }, [size, segments]);

  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
        geometryRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!materialRef.current || !midTexture) return;
    materialRef.current.customUniforms.map.value = midTexture;
    materialRef.current.customUniforms.lowMap.value = lowTexture;
    materialRef.current.customUniforms.highMap.value = highTexture;
    materialRef.current.needsUpdate = true;
  }, [highTexture, lowTexture, midTexture]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.onShaderCompiled = () => {
        if (!useGameStore.getState().litTerrainMaterialLoaded) {
          setLitTerrainMaterialLoaded(true);
        }
      };
    }
    const material = materialRef.current;
    return () => {
      if (material) {
        material.onShaderCompiled = undefined;
      }
    };
  }, [setLitTerrainMaterialLoaded]);

  useEffect(() => {
    if (!materialRef.current) return;

    if (materialRef.current.userData.shader && !useGameStore.getState().litTerrainMaterialLoaded) {
      setLitTerrainMaterialLoaded(true);
    }

    const uniforms = materialRef.current.customUniforms;

    uniforms.uMaxHeight.value = maxHeight;
    uniforms.uFrequency.value = frequency;
    uniforms.uAmplitude.value = amplitude;
    uniforms.uOctaves.value = octaves;
    uniforms.uLacunarity.value = lacunarity;
    uniforms.uPersistence.value = persistence;
    uniforms.uExponentiation.value = exponentiation;

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
    setLitTerrainMaterialLoaded,
  ]);

  return (
    <mesh ref={ref} position={[0, 0, 0]} castShadow receiveShadow geometry={geometry}>
      <litTerrainMaterial ref={materialRef} attach="material" side={THREE.DoubleSide} />
    </mesh>
  );
});

export default Terrain;
