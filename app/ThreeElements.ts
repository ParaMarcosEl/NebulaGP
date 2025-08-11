import { extend, ThreeElement } from '@react-three/fiber';
import { LitTerrainMaterial } from '@/Components/Terrain/Terrain/LitTerrainMaterial';
import { WorkerTerrainMaterial } from '@/Components/LODTerrain/Worker/WorkerTerrainMaterial';
import { WorkerTerrainShader } from '@/Components/LODTerrain/Worker/WorkerTerrainShader';
import * as THREE from 'three';
import { SingleTextureMaterial } from '@/Components/LODTerrain/Worker/SingleTextureMaterial';
import { ShieldMaterial } from './Components/WeaponPad/ShieldMaterial';

extend({ LitTerrainMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    litTerrainMaterial: ThreeElement<typeof THREE.MeshStandardMaterial> & {
      onShaderCompiled?: () => void;
      worldOrigin?: THREE.Vector2;
      position?: THREE.Vector3;
      size?: number; // Size of the terrain plane
      segments?: number; // Resolution of the terrain plane
      maxHeight?: number; // Terrain height scale
      frequency?: number; // Noise frequency
      amplitude?: number; // Noise amplitude
      octaves?: number; // Number of noise octaves
      lacunarity?: number; // Lacunarity for FBM
      persistence?: number; // Persistence for FBM
      exponentiation?: number; // Exponentiation for FBM
      textureBlend?: number;
      lowMap?: THREE.Texture;
      highMap?: THREE.Texture;
      map?: THREE.Texture;
    };
  }
}
extend({ WorkerTerrainMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    workerTerrainMaterial: ThreeElement<typeof THREE.MeshStandardMaterial> & {
      onShaderCompiled?: () => void;
      worldOrigin?: THREE.Vector2;
      position?: THREE.Vector3;
      size?: number; // Size of the terrain plane
      segments?: number; // Resolution of the terrain plane
      maxHeight?: number; // Terrain height scale
      frequency?: number; // Noise frequency
      amplitude?: number; // Noise amplitude
      octaves?: number; // Number of noise octaves
      lacunarity?: number; // Lacunarity for FBM
      persistence?: number; // Persistence for FBM
      exponentiation?: number; // Exponentiation for FBM
      textureBlend?: number;
      lowMap?: THREE.Texture;
      highMap?: THREE.Texture;
      map?: THREE.Texture;
    };
  }
}

extend({ WorkerTerrainShader });

declare module '@react-three/fiber' {
  interface ThreeElements {
    workerTerrainShader: ThreeElement<typeof THREE.ShaderMaterial> & {
      // These are the actual uniforms expected by WorkerTerrainMaterial
      lowMap?: THREE.Texture;
      highMap?: THREE.Texture;
      map?: THREE.Texture;
      textureBlend?: number; // This uniform is defined in the material but not used in the current shader
      uTextureScale?: number;
      uDirectionalLightColor?: THREE.Color;
      uDirectionalLightDirection?: THREE.Vector3;
      uAmbientLightColor?: THREE.Color;
    };
  }
}

extend({ SingleTextureMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    singleTextureMaterial: ThreeElement<typeof THREE.MeshStandardMaterial> & {
      textureMap?: THREE.Texture;
      uTextureScale?: number;
    };
  }
}

extend({ ShieldMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    shieldMaterial: ThreeElement<typeof THREE.ShaderMaterial> & {
      uTime: number;
      uShieldValue: number;
    };
  }
}
