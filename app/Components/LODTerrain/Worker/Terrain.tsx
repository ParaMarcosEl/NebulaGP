
import { useEffect, useRef, forwardRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { ITerrainChunkProps, Y_OFFSET, TERRAIN_PROPS, TerrainChunkRequest } from '@/Constants';
import { useGameStore } from '@/Controllers/GameController';
import { useTexture } from '@react-three/drei';
import { WorkerTerrainMaterial } from './WorkerTerrainMaterial';

extend({ WorkerTerrainMaterial });

// interface TerrainWorker {
//   calculateTerrainChunk(request: TerrainChunkRequest): Promise<TerrainChunkResponse>;
// }

const Terrain = forwardRef<THREE.Mesh, ITerrainChunkProps>(function Terrain(
  {
    worldOrigin = new THREE.Vector2(0, 0),
    position = new THREE.Vector3(0, Y_OFFSET, 0),
    size = TERRAIN_PROPS.size,
    segments = TERRAIN_PROPS.segments,
    maxHeight = TERRAIN_PROPS.maxHeight,
    frequency = TERRAIN_PROPS.frequency,
    amplitude = TERRAIN_PROPS.amplitude,
    octaves = TERRAIN_PROPS.octaves,
    lacunarity = TERRAIN_PROPS.lacunarity,
    persistence = TERRAIN_PROPS.persistence,
    exponentiation = TERRAIN_PROPS.exponentiation,
    midMapPath = TERRAIN_PROPS.midMapPath,
    highMapPath = TERRAIN_PROPS.highMapPath,
    lowMapPath = TERRAIN_PROPS.lowMapPath,
  },
  ref,
) {
  const materialRef = useRef<WorkerTerrainMaterial>(null);
  // // holding workerState proxy to ensure worker is ready before use
  // const [workerState, setWorkerState] = useState<{
  //   worker: Worker | null;
  //   terrainWorker: TerrainWorker | null;
  // }>({ worker: null, terrainWorker: null });

  // useEffect(() => {
  //   const workerInstance = new Worker(new URL('./TerrainWorker.worker.ts', import.meta.url), {
  //     type: 'module',
  //   });
  //   const terrainWorker = wrap<TerrainWorker>(workerInstance);
  //   setWorkerState({ worker: workerInstance, terrainWorker });
  //   return () => {
  //     workerInstance.terminate();
  //   };
  // }, []);

  // const { terrainWorker } = workerState;
  const [terrainGeometry, setTerrainGeometry] = useState<THREE.PlaneGeometry | null>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const setLitTerrainMaterialLoaded = useGameStore((state) => state.setLitTerrainMaterialLoaded);

  const [lowTexture, midTexture, highTexture] = useTexture([lowMapPath, midMapPath, highMapPath]);
  
  [lowTexture, midTexture, highTexture].forEach((tex) => {
    if (tex) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
    }
  });
  
  const texturesReady = useMemo(() => lowTexture && midTexture && highTexture, [lowTexture, midTexture, highTexture]);
  
  useEffect(() => {
    if (!texturesReady) return;
    
      // const positions = new Float32Array(positionSAB);
      // const normals = new Float32Array(normalSAB);
      // const elevations = new Float32Array(elevationSAB);
      // const uvs = new Float32Array(uvSAB);
      // const indices = new Uint32Array(indexSAB);
    // Main thread - terrain.tsx (or wherever you're preparing the SAB and posting to the worker)

    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const vertexCount = (segments + 1) * (segments + 1);

    // Create SharedArrayBuffers
    const positionSAB = new SharedArrayBuffer(vertexCount * 3 * 4);
    const uvSAB = new SharedArrayBuffer(vertexCount * 2 * 4);
    // const elevationSAB = new SharedArrayBuffer(vertexCount * 4);
    // const normalSAB = new SharedArrayBuffer(vertexCount * 3 * 4);

    // Fill SharedArrayBuffers with initial geometry data
    const positions = new Float32Array(positionSAB);
    const uvData = new Float32Array(uvSAB);

    const geomPositions = geom.attributes.position.array as Float32Array;
    const geomUVs = geom.attributes.uv.array as Float32Array;

    
    positions.set(geomPositions);
    uvData.set(geomUVs);
    
    // 🛠 Replace geometry attributes with SharedArrayBuffer views
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvData, 2));

    const request: TerrainChunkRequest = {
      positions: positions,
      uvs: positions,
      noiseParams: {
        uMaxHeight: maxHeight,
        uFrequency: frequency,
        uAmplitude: amplitude,
        uOctaves: octaves,
        uLacunarity: lacunarity,
        uPersistence: persistence,
        uExponentiation: exponentiation,
        uWorldOffset: { x: position.x - worldOrigin.x, y: position.z - worldOrigin.y },
        uWorldOrigin: { x: worldOrigin.x, y: worldOrigin.y },
      },
      chunkSize: size,
      resolution: segments,
    };

    const worker = new Worker(new URL('./TerrainWorker.worker.js', import.meta.url));

    // worker.onmessage = ({ data }) => {
    //   console.log('Main thread received:', data);
    //   geom.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    //   geom.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    //   geom.setAttribute('elevation', new THREE.BufferAttribute(data.elevations, 1));
      
    //   geom.computeBoundingSphere();
    //   geom.computeBoundingBox();

    //   setTerrainGeometry(geom);
    //   geometryRef.current = geom;
    // };

    worker.onmessage = ({ data }) => {
      console.log('Main thread received:', data);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const vertexCount = (segments + 1) * (segments + 1);

      const positions = new Float32Array(data.positions);
      const normals = new Float32Array(data.normals);
      const elevations = new Float32Array(data.elevations);

      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geom.setAttribute('elevation', new THREE.BufferAttribute(elevations, 1));

      geom.computeBoundingSphere();
      geom.computeBoundingBox();

      setTerrainGeometry(geom);
      geometryRef.current = geom;
    };


    worker.onerror = (e) => console.error('Worker error:', e);
    worker.onmessageerror = (e) => console.error('Message error:', e);

    try {
      console.log({ request });
      worker.postMessage(request)
    } catch (syncError) {
      console.error('Synchronous error:', syncError);
    }
    
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
        geometryRef.current = null;
      }
    };
  }, [size, segments, maxHeight, frequency, amplitude, octaves, lacunarity, persistence, exponentiation, position.x, position.z, worldOrigin.x, worldOrigin.y, texturesReady]);

  // COMBINED EFFECT for all material uniform assignments
  useEffect(() => {
    if (!materialRef.current || !texturesReady) return;

    const uniforms = materialRef.current.customUniforms;

    uniforms.highMap.value = highTexture;
    uniforms.lowMap.value = lowTexture;
    uniforms.map.value = midTexture;
    uniforms.textureBlend.value = .5;
    uniforms.uTextureScale.value = 0.08; // Set a consistent, larger value
    
    if (materialRef.current.userData.shader && !useGameStore.getState().litTerrainMaterialLoaded) {
      setLitTerrainMaterialLoaded(true);
    }
  }, [
    highTexture, lowTexture, midTexture, setLitTerrainMaterialLoaded, texturesReady,
  ]);
  
  // Use useFrame to update uniforms if needed, e.g., for time-based animations
  // This is a good place to put uniforms that change every frame
  // useFrame(() => {
  //   if (materialRef.current && materialRef.current.customUniforms.uTime) {
  //     materialRef.current.customUniforms.uTime.value += 0.01;
  //   }
  // });

  return terrainGeometry ? (
    <mesh
      ref={ref}
      position={[0, 0, 0]}
      castShadow
      receiveShadow
      geometry={terrainGeometry}
    >
      <meshStandardMaterial
        ref={materialRef} 
        attach="material" 
        side={THREE.DoubleSide}
      />
    </mesh>
  ) : null;
});

export default Terrain;

// import { useEffect, useRef, useState, useMemo, forwardRef } from 'react';
// import * as THREE from 'three';
// import { extend } from '@react-three/fiber';
// import { useTexture } from '@react-three/drei';
// import { ITerrainChunkProps, Y_OFFSET, TERRAIN_PROPS } from '@/Constants';
// import { useGameStore } from '@/Controllers/GameController';
// import { WorkerTerrainMaterial } from './WorkerTerrainMaterial';

// extend({ WorkerTerrainMaterial });

// const Terrain = forwardRef<THREE.Mesh, ITerrainChunkProps>(function Terrain({
//   worldOrigin = new THREE.Vector2(0, 0),
//   position = new THREE.Vector3(0, Y_OFFSET, 0),
//   size = TERRAIN_PROPS.size,
//   segments = TERRAIN_PROPS.segments,
//   maxHeight = TERRAIN_PROPS.maxHeight,
//   frequency = TERRAIN_PROPS.frequency,
//   amplitude = TERRAIN_PROPS.amplitude,
//   octaves = TERRAIN_PROPS.octaves,
//   lacunarity = TERRAIN_PROPS.lacunarity,
//   persistence = TERRAIN_PROPS.persistence,
//   exponentiation = TERRAIN_PROPS.exponentiation,
//   midMapPath = TERRAIN_PROPS.midMapPath,
//   highMapPath = TERRAIN_PROPS.highMapPath,
//   lowMapPath = TERRAIN_PROPS.lowMapPath,
// }, ref) {
//   const materialRef = useRef<WorkerTerrainMaterial>(null);
//   const geometryRef = useRef<THREE.BufferGeometry | null>(null);
//   const meshRef = useRef<THREE.Mesh>(null);
//   const [terrainGeometry, setTerrainGeometry] = useState<THREE.BufferGeometry | null>(null);
//   const setLitTerrainMaterialLoaded = useGameStore((s) => s.setLitTerrainMaterialLoaded);

//   const [lowTexture, midTexture, highTexture] = useTexture([lowMapPath, midMapPath, highMapPath]);
//   const texturesReady = useMemo(() => lowTexture && midTexture && highTexture, [lowTexture, midTexture, highTexture]);

//   [lowTexture, midTexture, highTexture].forEach((tex) => {
//     tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
//     tex.needsUpdate = true;
//   });

// useEffect(() => {
//   const resolution = segments + 1;
//   const vertexCount = resolution * resolution;
//   const triangleCount = (resolution - 1) * (resolution - 1) * 2;
//   const indexCount = triangleCount * 3;

//   const positionSAB = new SharedArrayBuffer(vertexCount * 3 * 4);
//   const normalSAB = new SharedArrayBuffer(vertexCount * 3 * 4);
//   const elevationSAB = new SharedArrayBuffer(vertexCount * 4);
//   const uvSAB = new SharedArrayBuffer(vertexCount * 2 * 4);
//   const indexSAB = new SharedArrayBuffer(indexCount * 4);

//   const positions = new Float32Array(positionSAB);
//   const normals = new Float32Array(normalSAB);
//   const elevations = new Float32Array(elevationSAB);
//   const uvs = new Float32Array(uvSAB);
//   const indices = new Uint32Array(indexSAB);

//   const worker = new Worker(new URL('./TerrainWorker.worker.ts', import.meta.url), { type: 'module' });

//   worker.onmessage = (e) => {
//     const { type } = e.data;
//     if (type === 'build-complete') {
//       const geometry = new THREE.BufferGeometry();
//       geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//       geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
//       geometry.setAttribute('elevation', new THREE.BufferAttribute(elevations, 1));
//       geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
//       geometry.setIndex(new THREE.BufferAttribute(indices, 1));
//       geometry.computeBoundingBox();
//       geometry.computeBoundingSphere();

//       geometryRef.current = geometry;
//       setTerrainGeometry(geometry);
//     }
//   };

//   worker.postMessage({
//     type: 'build-terrain',
//     payload: {
//       sab: {
//         positions: positionSAB,
//         normals: normalSAB,
//         elevations: elevationSAB,
//         uvs: uvSAB,
//         indices: indexSAB,
//       },
//       noiseParams: {
//         uMaxHeight: maxHeight,
//         uFrequency: frequency,
//         uAmplitude: amplitude,
//         uOctaves: octaves,
//         uLacunarity: lacunarity,
//         uPersistence: persistence,
//         uExponentiation: exponentiation,
//         uWorldOffset: {
//           x: position.x - worldOrigin.x,
//           y: position.z - worldOrigin.y,
//         },
//         uWorldOrigin: {
//           x: worldOrigin.x,
//           y: worldOrigin.y,
//         },
//       },
//       chunkSize: size,
//       resolution,
//     },
//   });

//   return () => {
//     worker.terminate();
//     if (geometryRef.current) {
//       geometryRef.current.dispose();
//       geometryRef.current = null;
//     }
//   };
// }, [
//   position.x, position.z, worldOrigin.x, worldOrigin.y,
//   maxHeight, frequency, amplitude, octaves,
//   lacunarity, persistence, exponentiation, size, segments
// ]);

//   useEffect(() => {
//     if (!materialRef.current || !texturesReady) return;
//     const uniforms = materialRef.current.customUniforms;
//     uniforms.map.value = midTexture;
//     uniforms.lowMap.value = lowTexture;
//     uniforms.highMap.value = highTexture;
//     uniforms.uTextureScale.value = 0.08;
//     uniforms.textureBlend.value = 0.5;

//     if (materialRef.current.userData.shader && !useGameStore.getState().litTerrainMaterialLoaded) {
//       setLitTerrainMaterialLoaded(true);
//     }
//   }, [highTexture, lowTexture, midTexture, setLitTerrainMaterialLoaded, texturesReady]);

//   return terrainGeometry ? (
//     <mesh
//       ref={(node) => {
//         meshRef.current = node;
//         if (typeof ref === 'function') ref(node);
//         else if (ref) (ref as React.MutableRefObject<THREE.Mesh | null>).current = node;
//       }}
//       geometry={terrainGeometry}
//       castShadow
//       receiveShadow
//       position={[0, 0, 0]}
//     >
//       <workerTerrainMaterial ref={materialRef} attach="material" side={THREE.DoubleSide} />
//     </mesh>
//   ) : null;
// });

// export default Terrain;
