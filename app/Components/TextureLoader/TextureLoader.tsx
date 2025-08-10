'use client';

// @/Components/TextureLoader/TextureLoader.tsx
import { useEffect } from 'react';
import { useTexture } from '@react-three/drei';

type TextureLoaderProps = {
  /** List of texture paths to preload */
  textures: string[];
};

export function TextureLoader({ textures }: TextureLoaderProps) {
  useEffect(() => {
    textures.forEach((path) => {
      useTexture.preload(path); // drei’s preload helper
    });
  }, [textures]);

  return null; // This component doesn’t render anything
}
