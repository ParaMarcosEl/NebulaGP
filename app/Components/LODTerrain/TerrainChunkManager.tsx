import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useTerrainChunkBuilder } from './useTerrainChunks';
import { QuadtreeNode } from './quadTree';
import * as THREE from 'three';
import { DEFAULT_CHUNK_PROPS_BUILDER } from '@/Constants';
import { Y_OFFSET } from '@/Constants';

const CHUNK_SIZE = 128;
const MAX_DEPTH = 8;
const SPLIT_THRESHOLD = 3;

const TerrainChunkManager = ({
  chunkSize = CHUNK_SIZE,
  yOffset = Y_OFFSET,
  lowMapPath,
  midMapPath,
  highMapPath,
  segments = 128,
  maxHeight = 400,
  frequency = 0.0006,
  amplitude = 5,
  octaves = 3,
  lacunarity = 2,
  persistence = 0.5,
  exponentiation = 3,
}: {
  chunkSize?: number;
  yOffset?: number;
  lowMapPath: string;
  midMapPath: string;
  highMapPath: string;
  segments?: number;
  maxHeight?: number;
  frequency?: number;
  amplitude?: number;
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
  exponentiation?: number;
}) => {
  const { camera } = useThree();
  const { chunks, enqueueChunks } = useTerrainChunkBuilder();
  const lastChunkCoords = useRef<THREE.Vector2 | null>(null);

  useEffect(() => {
    const getChunkCoord = (position: THREE.Vector3) => {
      return new THREE.Vector2(
        Math.floor(position.x / chunkSize),
        Math.floor(position.z / chunkSize),
      );
    };

    const currentChunk = getChunkCoord(camera.position);

    // If we've already built terrain for this chunk, don't rebuild
    if (lastChunkCoords.current && lastChunkCoords.current.equals(currentChunk)) {
      return;
    }

    // Update the last known chunk
    lastChunkCoords.current = currentChunk.clone();

    // Compute terrain root center in XZ plane, ahead of aircraft:
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion); // aircraft's forward direction

    const rootCenter = new THREE.Vector2(camera.position.x, camera.position.z);

    // Proceed with building the quadtree
    const rootSize = chunkSize * Math.pow(2, MAX_DEPTH);
    const root = new QuadtreeNode(rootCenter, rootSize);
    splitNodeRecursively(root, new THREE.Vector2(camera.position.x, camera.position.z));
    const leafNodes = root.getLeafNodes();

    const chunkProps = leafNodes.map((node) => ({
      ...DEFAULT_CHUNK_PROPS_BUILDER,
      worldOrigin: rootCenter,
      position: new THREE.Vector3(node.center.x, yOffset, node.center.y),
      size: node.size,
      lowMapPath,
      midMapPath,
      highMapPath,
      segments,
      maxHeight,
      frequency,
      amplitude,
      octaves,
      lacunarity,
      persistence,
      exponentiation,
    }));
    enqueueChunks(chunkProps);
  }, [
    enqueueChunks,
    camera,
    midMapPath,
    lowMapPath,
    highMapPath,
    chunkSize,
    yOffset,
    segments,
    maxHeight,
    frequency,
    amplitude,
    octaves,
    lacunarity,
    persistence,
    exponentiation,
  ]);

  return <>{chunks}</>;
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
