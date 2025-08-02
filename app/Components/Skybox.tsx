import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';

type SkyboxPropsType = {
  stageName?: string;
};

export function Skybox({ stageName = 'stageA' }: SkyboxPropsType) {
  const { scene } = useThree();

  const skyboxTexture = useMemo(() => {
    const loader = new THREE.CubeTextureLoader();

    return loader.load([
      `/textures/${stageName}/right.png`, // +X
      `/textures/${stageName}/left.png`, // -X
      `/textures/${stageName}/top.png`, // +Y
      `/textures/${stageName}/bottom.png`, // -Y
      `/textures/${stageName}/front.png`, // +Z
      `/textures/${stageName}/back.png`, // -Z
    ]);
  }, [stageName]);

  useEffect(() => {
    scene.background = skyboxTexture;
  }, [scene, skyboxTexture]);

  return null;
}
