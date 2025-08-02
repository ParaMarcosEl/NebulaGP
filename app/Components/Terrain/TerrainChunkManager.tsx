import { useFrame, useThree } from '@react-three/fiber';
import { useState, useMemo } from 'react';
import * as THREE from 'three';
import Terrain from './Terrain/Terrain';
import { QuadtreeNode } from '@/Components/LODTerrain/quadTree';
import { DEFAULT_CHUNK_PROPS_BUILDER, ITerrainChunkProps } from '@/Constants';

const CHUNK_SIZE = 100;
const MAX_DEPTH = 6; // Max subdivision levels
const SPLIT_THRESHOLD = 1.5; // Multiplier for split distance

type ChunkKey = string;

const getChunkKey = (center: THREE.Vector2, size: number): ChunkKey =>
  `${center.x}_${center.y}_${size}`;

const TerrainChunkManager = () => {
  const { camera } = useThree();

  const [chunks, setChunks] = useState<Map<ChunkKey, ITerrainChunkProps>>(new Map());

  const rootCenter = useMemo(() => new THREE.Vector2(0, 0), []);
  const rootSize = CHUNK_SIZE * Math.pow(2, MAX_DEPTH); // Covers a large initial area

  useFrame(() => {
    const camera2D = new THREE.Vector2(camera.position.x, camera.position.z);

    const root = new QuadtreeNode(rootCenter.clone(), rootSize);
    splitNodeRecursively(root, camera2D);

    const leafNodes = root.getLeafNodes();

    const newChunks = new Map<ChunkKey, ITerrainChunkProps>();
    console.log(JSON.stringify({ rootCenter, rootSize }, null, 2))
    for (const node of leafNodes) {
      console.log(JSON.stringify({ childCenter: node.center, childSize: node.size}, null, 2))
      const key = getChunkKey(node.center, node.size);
      if (!chunks.has(key)) {
        newChunks.set(key, {
          worldOrigin: rootCenter,
          position: new THREE.Vector3(node.center.x, 0, node.center.y),
          size: node.size,
          ...DEFAULT_CHUNK_PROPS_BUILDER
        });
      } else {
        newChunks.set(key, chunks.get(key)!);
      }
    }

    // Only update state if new chunks were added or removed
    if (newChunks.size !== chunks.size || [...newChunks.keys()].some(k => !chunks.has(k))) {
      setChunks(newChunks);
    }
  });

  return (
    <>
      {[...chunks.values()].map((props) => (
        <Terrain key={`${props.position.x}_${props.position.z}_${props.size}`} {...props} />
      ))}
    </>
  );
};

export default TerrainChunkManager;

function splitNodeRecursively(node: QuadtreeNode, cameraPos: THREE.Vector2, depth = 0) {
  if (depth >= MAX_DEPTH) return;

  const dist = cameraPos.distanceTo(node.center);
  if (dist < node.size * SPLIT_THRESHOLD) {
    node.split();
    for (const child of node.children) {
      splitNodeRecursively(child, cameraPos, depth + 1);
    }
  }
}
