import { useFrame } from '@react-three/fiber';
import { useRef, useState, useCallback, ReactElement, useEffect } from 'react';
import { ITerrainChunkProps } from '@/Constants';
import * as THREE from 'three';
import Terrain from './Terrain/Terrain';
import { useGameStore } from '@/Controllers/GameController';

// Pool to reuse terrain chunks (simple object pool pattern)
const terrainPool: THREE.Mesh[] = [];

export function useTerrainChunkBuilder() {
  const [doneBuilding, setDoneBuilding] = useState(false);
  // Access the terrain loading state setters from the game store
  const { setTotalTerrainChunks, incrementLoadedTerrainChunks, resetTerrainLoading } = useGameStore();
  
  const buildQueue = useRef<ITerrainChunkProps[]>([]);
  const activeChunks = useRef<Map<string, ReactElement>>(new Map());
  const [renderedChunks, setRenderedChunks] = useState<ReactElement[]>([]);

  const enqueueChunks = useCallback((chunks: ITerrainChunkProps[]) => {
    buildQueue.current.push(...chunks);
    setTotalTerrainChunks(chunks.length); // Inform the store about the total chunks to build
  }, [setTotalTerrainChunks]);

  const createKey = (pos: THREE.Vector3, size: number) =>
  `${Math.floor(pos.x / size)}_${Math.floor(pos.z / size)}_${size}`;

  // Generator-based terrain creation function
  function* buildTerrainChunk(props: ITerrainChunkProps) {
    // Simulate work across multiple frames
    yield; // Initial yield

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mesh = terrainPool.pop() || new THREE.Mesh();
    yield;

    const { position : { x, y, z }, size } = props;

    const chunkElement = (
      <Terrain
        key={createKey(new THREE.Vector3(Math.floor(x), Math.floor(y), Math.floor(z)), Math.floor(size))}
        ref={(ref: THREE.Mesh | null) => {
          if (ref) {
            ref.position.copy(props.position);
            ref.geometry.dispose();
            ref.geometry = new THREE.PlaneGeometry(
              props.size,
              props.size,
              props.segments,
              props.segments
            ).rotateX(-Math.PI / 2); // if needed
          }
        }}
        {...props}
      />
    );

    yield; // Simulate more processing

    return chunkElement;
  }

  // Builder coroutine
  const currentBuilder = useRef<Generator<unknown, ReactElement | undefined> | null>(null);
  const currentChunkProps = useRef<ITerrainChunkProps | null>(null);

  useFrame(() => {
    if (!currentBuilder.current && buildQueue.current.length > 0) {
      currentChunkProps.current = buildQueue.current.shift()!;
      currentBuilder.current = buildTerrainChunk(currentChunkProps.current);
      setDoneBuilding(false);
    }

    if (currentBuilder.current) {
      const result = currentBuilder.current.next();
      if (result.done && result.value) {
        const key = createKey(currentChunkProps.current!.position, currentChunkProps.current!.size);
        activeChunks.current.set(key, result.value);
        incrementLoadedTerrainChunks(); // Inform the store that a chunk is loaded
        currentBuilder.current = null;
        currentChunkProps.current = null;

        // Once all chunks are done, update visible terrain
        if (
          buildQueue.current.length === 0 &&
          currentBuilder.current === null
        ) {
          if (buildQueue.current.length === 0 && currentBuilder.current === null) {
            setRenderedChunks([...activeChunks.current.values()]);
          }
        }
      }
    }
  });

  // Effect to reset terrain loading state when the component unmounts or for initial setup
  useEffect(() => {
    return () => {
      resetTerrainLoading();
    };
  }, [resetTerrainLoading]);

  return {
    chunks: renderedChunks,
    enqueueChunks,
    poolChunk(mesh: THREE.Mesh) {
      terrainPool.push(mesh);
    },
    doneBuilding
  };
}
