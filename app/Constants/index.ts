import { QuadtreeNode } from '@/Components/LODTerrain/quadTree';
import * as THREE from 'three';

// curve
export const NUM_POINTS = 32; // Number of control points
export const LAP_RADIUS = 400; // Approximate size of loop
export const HEIGHT_VARIATION = 50; // Max vertical offset
export const SEED = Math.random() * Date.now();
export const TUBE_RADIUS = 30;
export const keyboardControlsMap = [
  { name: 'forward', keys: ['KeyI'] },
  { name: 'backward', keys: ['KeyK'] },
  { name: 'pitchDown', keys: ['KeyW'] },
  { name: 'pitchUp', keys: ['KeyS'] },
  { name: 'rollLeft', keys: ['KeyA'] },
  { name: 'rollRight', keys: ['KeyD'] },
  { name: 'shoot', keys: ['KeyJ'] },
];

type shipType = {
  scale: number,
  offset?: [number, number, number] | THREE.Vector3;
  rotation: number | THREE.Euler | [x: number, y: number, z: number, order?: THREE.EulerOrder | undefined],
  path: string
}

export const SHIPS: Record<string, shipType> = {
  ship01: {
    scale: 1,
    rotation: [0, Math.PI, 0],
    path: '/models/spaceship.glb'
  },
  ship02: {
    scale: 4,
    rotation: [0, -Math.PI, 0],
    path: '/models/spaceship02.glb'
  },
  ship03: {
    scale: 4,
    offset: [0, .5, 0],
    rotation: [0, 0, 0],
    path: '/models/spaceship03.glb'
  },
  ship04: {
    scale: 3,
    rotation: [0, Math.PI/2, 0],
    path: '/models/spaceship04.glb'
  },
  ship05: {
    scale: 4,
    offset: [0, .5, 0],
    rotation: [0, Math.PI, 0],
    path: '/models/spaceship05.glb'
  },
}

export const CHUNK_SIZE = 128;
export const MAX_DEPTH = 4;
export const SPLIT_THRESHOLD = 1.5;

// SHIP
export const MAX_SPEED = 1;
export const SHIP_SCALE = 1;

// AI
export const BOT_SPEED = 0.0008;

//
export const TOTAL_LAPS = 3;

//Terrain
export const TERRAIN_PROPS = {
  size: 100,
  segments: 64,
  maxHeight: 300,
  frequency: 0.03,
  amplitude: 1.0,
  octaves: 6.0,
  lacunarity: 5.0,
  persistence: 0.5,
  exponentiation: 1.0,
  midMapPath: '/textures/icy_ground128.png',
  lowMapPath: '/textures/rocky_ground128.png', // Example low elevation texture
  highMapPath: '/textures/molten_rock128.png', // Example high elevation texture
  textureBlend: 0.2, // Controls blend sharpness (smaller = sharper, 0 to 1)
};
export const Y_OFFSET = -175;

// constants/layers.ts
export const BLOOM_LAYER = 1;

export type BotType = {
  mesh: THREE.Group;
  speed: number;
  currentCheckpointIndex: number;
  lap: number;
  finished: boolean;
};

export type RacerProgressType = {
  player: number;
  bots: number[];
};

export type SvgMapOptions = {
  svgWidth: number;
  svgHeight: number;
  padding: number;
  numSegments: number;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
};

export type curveType = THREE.Curve<THREE.Vector3>;

export interface AircraftHandle {
  object: THREE.Group | null;
  applyBoost: () => void;
}

// Extend ShaderMaterial to include those uniforms
export type CustomShaderMaterial = THREE.ShaderMaterial & {
  uniforms: CustomUniforms;
};

// Define custom uniforms type
export type CustomUniforms = {
  uTime: { value: number };
  [key: string]: { value: unknown }; // optional, to support other uniforms
};

// useFrame(({ clock }) => {
//   if (materialRef.current) {
//     materialRef.current.uniforms.uTime.value = clock.elapsedTime;
//   }
// });

// // In JSX
// <shaderMaterial
//   ref={materialRef}
//   uniforms={{
//     uTime: { value: 0 },
//     // any other uniforms
//   }}
//   vertexShader={vertexShader}
//   fragmentShader={fragmentShader}
// />

export interface TerrainChunkDescriptor {
  key: string; // "x_z" identifier
  position: THREE.Vector3;
  params: {
    size: number;
    segments: number;
    maxHeight: number;
    frequency: number;
    amplitude: number;
    octaves: number;
    persistence: number;
    lacunarity: number;
    exponentiation: number;
  };
}

// --- types.ts (New definitions for better type safety and clarity) ---
// Props interface for the base Terrain component
export interface ITerrainChunkProps {
  worldOrigin: THREE.Vector2; // Global origin for noise (passed to shader)
  position: THREE.Vector3; // Local position of this terrain chunk mesh
  size: number; // Size of the terrain plane
  segments: number; // Resolution of the terrain plane
  maxHeight: number; // Terrain height scale
  frequency: number; // Noise frequency
  amplitude: number; // Noise amplitude
  octaves: number; // Number of noise octaves
  lacunarity: number; // Lacunarity for FBM
  persistence: number; // Persistence for FBM
  exponentiation: number; // Exponentiation for FBM
  textureBlend: number;
  lowMapPath: string;
  midMapPath: string;
  highMapPath: string;
  overrideGeometry?: THREE.BufferGeometry | null;
  setShaderCompiled?: (compiled: boolean) => void; // Optional callback to notify when shader is compiled
}

// Represents a terrain chunk instance managed within the pooling system
export interface PooledChunkInstance {
  id: string; // A unique identifier for this specific pooled instance (e.g., "pooled_chunk_0")
  props: ITerrainChunkProps; // The set of properties currently assigned to the wrapped Terrain component
  visible: boolean; // Controls whether this pooled instance is currently rendered in the scene
  available: boolean; // Indicates if this pooled instance is free to be used by the builder queue
  ref: React.RefObject<THREE.Group>; // A React ref to the Three.js group object that wraps the Terrain component
}

// Represents a request to build/configure a new terrain chunk, derived from the quadtree
export interface ChunkRequest extends ITerrainChunkProps {
  requestKey: string; // A unique key for this chunk (e.g., "x_y" coordinates)
  quadtreeNode: QuadtreeNode; // Reference to the QuadtreeNode that generated this request
}

export const DEFAULT_CHUNK_PROPS_BUILDER: Omit<
  ITerrainChunkProps,
  'position' | 'size' | 'worldOrigin' | 'texturePath'
> = {
  segments: 128,
  maxHeight: 1500,
  frequency: 0.0013,
  amplitude: 2,
  octaves: 3.0,
  lacunarity: 2.5,
  persistence: 0.2,
  exponentiation: 3.0,
  textureBlend: 0.2,
  highMapPath: '/textures/icy_ground128.png',
  lowMapPath: '/textures/rocky_ground128.png',
  midMapPath: '/textures/molten_rock128.png',
  overrideGeometry: null,
};

export interface TerrainWorkerResponse {
  vertices: number[][]; // An array of arrays, where each inner array represents a vertex [x, y, z]
  indices: number[]; // An array of numbers, representing the indices for the triangulation of the vertices
}

export interface TerrainWorkerRequest {
  type: string;
  key: string;
  props: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    size: number;
    resolution: number;
  };
}

export function rebuildMeshFromData(data: TerrainWorkerResponse): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const flatVertices = data.vertices.flat();
  const vertices = new Float32Array(flatVertices);
  const indices = new Uint32Array(data.indices);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  return geometry;
}

export interface TerrainChunkRequest {
  positions: Float32Array;
  uvs: Float32Array;
  noiseParams: {
    uMaxHeight: number;
    uFrequency: number;
    uAmplitude: number;
    uOctaves: number;
    uLacunarity: number;
    uPersistence: number;
    uExponentiation: number;
    uWorldOffset: { x: number; y: number };
    uWorldOrigin: { x: number; y: number };
  };
  chunkSize: number;
  resolution: number;
}

export interface TerrainChunkResponse {
  positions: Float32Array;
  normals: Float32Array;
  elevations: Float32Array;
}
