import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useTerrainChunkBuilder } from './useTerrainChunks';
import { QuadtreeNode } from './quadTree';
import * as THREE from 'three';
import { DEFAULT_CHUNK_PROPS_BUILDER } from '@/Constants';
import { Y_OFFSET, CHUNK_SIZE, MAX_DEPTH, SPLIT_THRESHOLD } from '@/Constants';

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
  const chunkCoord = useMemo(() => new THREE.Vector2(), []);
  const rootCenter = useMemo(() => new THREE.Vector2(), []);
  const forward = useMemo(() => new THREE.Vector3(0, 0, -1), []);

  const getChunkCoord = useCallback(
    (position: THREE.Vector3) => {
      chunkCoord.set(Math.floor(position.x / chunkSize), Math.floor(position.z / chunkSize));
      return chunkCoord;
    },
    [chunkCoord, chunkSize],
  );

  useEffect(() => {
    const currentChunk = getChunkCoord(camera.position);

    // If we've already built terrain for this chunk, don't rebuild
    if (lastChunkCoords.current && lastChunkCoords.current.equals(currentChunk)) {
      return;
    }

    // Update the last known chunk
    lastChunkCoords.current = currentChunk.clone();

    // Compute terrain root center in XZ plane, ahead of aircraft:
    forward.applyQuaternion(camera.quaternion); // aircraft's forward direction

    rootCenter.set(camera.position.x, camera.position.z);

    // Proceed with building the quadtree
    const rootSize = chunkSize * Math.pow(2, MAX_DEPTH);
    const root = new QuadtreeNode(rootCenter, rootSize);
    splitNodeRecursively(root, rootCenter);
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
    forward,
    chunkCoord,
    rootCenter,
    getChunkCoord,
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
