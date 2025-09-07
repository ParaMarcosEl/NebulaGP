'use client';

import { useThree } from '@react-three/fiber';
import { CubeTree } from './CubeTree';
import { Vector3, Group } from 'three';
import { useMemo, memo, useRef, useState, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping, LinearFilter } from 'three';

type PlanetDebugProps = {
  position?: Vector3 | [number, number, number];
  planetSize?: number;
  cubeSize?: number;
  lowTextPath?: string;
  midTextPath?: string;
  highTextPath?: string;
  maxHeight?: number;
  frequency?: number;
  amplitude?: number;
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
  exponentiation?: number;
  animate?: boolean;
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

  const timeRef = useRef(0);
  const { camera } = useThree();
  const [planetGroup, setPlanetGroup] = useState<Group | null>(null);

  // Memoize CubeTree
  const cubeTree = useMemo(
    () =>
      new CubeTree(planetSize, cubeSize, lowTexture, midTexture, highTexture, {
        uMaxHeight: maxHeight,
        uFrequency: frequency,
        uAmplitude: amplitude,
        uOctaves: octaves,
        uLacunarity: lacunarity,
        uPersistence: persistence,
        uExponentiation: exponentiation,
        uTime: timeRef.current,
      }),
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

  // Async update
  useEffect(() => {
    let mounted = true;
    (async () => {
      const group = await cubeTree.getDynamicMeshesAsync(camera);
      if (mounted) setPlanetGroup(group);
    })();
    return () => {
      mounted = false;
    };
  }, [cubeTree, camera]);

  return <group position={position}>{planetGroup && <primitive object={planetGroup} />}</group>;
}

export default memo(LODPlanet);
