import { useThree } from '@react-three/fiber';

import { CubeTree } from './CubeTree';

import { Vector3 } from 'three';

import { useMemo, memo, useRef } from 'react';

import { useTexture } from '@react-three/drei';

import { RepeatWrapping, LinearFilter } from 'three';

type PlanetDebugProps = {
  position?: Vector3 | [number, number, number];

  planetSize?: number;

  cubeSize?: number;

  lowTextPath?: string;

  midTextPath?: string;

  highTextPath?: string; // 🔹 Noise uniforms

  maxHeight?: number;

  frequency?: number;

  amplitude?: number;

  octaves?: number;

  lacunarity?: number;

  persistence?: number;

  exponentiation?: number;
  animate?: boolean
};

export function LODPlanet({
  position,

  planetSize = 5,

  cubeSize = 16,

  lowTextPath = '/textures/icy_ground.png',

  midTextPath = '/textures/rocky_ground.png',

  highTextPath = '/textures/molten_rock.png',

  maxHeight = 300,

  frequency = 20,

  amplitude = 0.5,

  octaves = 2,

  lacunarity = 3.0,

  persistence = 0.5,

  exponentiation = 2,
}: PlanetDebugProps) {
  const [lowTexture, midTexture, highTexture] = useTexture([
    lowTextPath,

    midTextPath,

    highTextPath,
  ]);

  [lowTexture, midTexture, highTexture].forEach((tex) => {
    tex.wrapS = RepeatWrapping;

    tex.wrapT = RepeatWrapping;

    tex.minFilter = LinearFilter;
  }); 
  // 🔹 Memoize CubeTree with uniforms
  const timeRef = useRef(0);

  const cubeTree = useMemo(
    () =>
      new CubeTree(
        planetSize,

        cubeSize,

        lowTexture,

        midTexture,

        highTexture,

        {
          uMaxHeight: maxHeight,

          uFrequency: frequency,

          uAmplitude: amplitude,

          uOctaves: octaves,

          uLacunarity: lacunarity,

          uPersistence: persistence,

          uExponentiation: exponentiation,
          uTime: timeRef.current
        },
      ),

    [
      planetSize,

      cubeSize,

      lowTexture,

      midTexture,

      highTexture,

      maxHeight,

      frequency,

      amplitude,

      octaves,

      lacunarity,

      persistence,

      exponentiation,
    ],
  );

  const { camera } = useThree();

  return (
    <group position={position}>
            <primitive object={cubeTree.getDynamicMeshes(camera)} />   {' '}
    </group>
  );
}

export default memo(LODPlanet);