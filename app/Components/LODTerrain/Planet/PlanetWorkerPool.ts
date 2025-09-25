'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { FBMParams } from './fbm';
import { PlanetMaterial } from './PlanetMaterial';
import { buildBVHForMeshes } from './LODPlanet';
import { prepareMeshBounds } from './CubeTree';
// import { getPlanetCache, setPlanetCache } from './planetCache';

type Task = {
  posBuffer: SharedArrayBuffer;
  normalBuffer: SharedArrayBuffer;
  elevationBuffer: SharedArrayBuffer;
  uvBuffer: SharedArrayBuffer;
  planetSize: number;
  params: FBMParams;
  segments: number;
  resolve: (geometry: THREE.BufferGeometry) => void;
  targetMesh?: THREE.Mesh;
};

class PlanetWorkerPool {
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerReady: Map<Worker, boolean> = new Map();
  private indexCache = new Map<number, Uint32Array>();
  private material: PlanetMaterial;

  // Buffer pools
  private posPool = new Map<number, SharedArrayBuffer[]>();
  private normalPool = new Map<number, SharedArrayBuffer[]>();
  private elevationPool = new Map<number, SharedArrayBuffer[]>();
  private uvPool = new Map<number, SharedArrayBuffer[]>();

  constructor(
    workerCount = navigator.hardwareConcurrency || 4,
    material = new PlanetMaterial(new THREE.Texture(), new THREE.Texture(), new THREE.Texture()),
  ) {
    this.material = material;
    this.workers = Array.from({ length: workerCount }, () => {
      const worker = new Worker(new URL('@/workers/PlanetWorker.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.workerReady.set(worker, false);

      worker.onmessage = (e) => {
        switch (e.data.type) {
          case 'ready':
            this.workerReady.set(worker, true);
            this.dispatch();
            break;
          case 'chunk_ready':
            this.onWorkerDone(worker, e.data);
            break;
          default:
            console.warn('Unknown message from worker:', e.data);
        }
      };

      return worker;
    });
  }

  // --- Buffer pooling helpers ---
  private getBuffer(
    pool: Map<number, SharedArrayBuffer[]>,
    vertexCount: number,
    bytesPerElement: number,
  ) {
    const poolArr = pool.get(vertexCount);
    if (poolArr && poolArr.length > 0) {
      return poolArr.pop()!;
    }
    return new SharedArrayBuffer(vertexCount * bytesPerElement);
  }

  private returnBuffer(
    pool: Map<number, SharedArrayBuffer[]>,
    vertexCount: number,
    buffer: SharedArrayBuffer,
  ) {
    if (!pool.has(vertexCount)) pool.set(vertexCount, []);
    pool.get(vertexCount)!.push(buffer);
  }

  // --- Main API ---
  enqueue(
    segments: number,
    planetSize: number,
    material: PlanetMaterial,
    params: FBMParams,
    targetMesh?: THREE.Mesh,
  ): Promise<THREE.BufferGeometry> {
    return new Promise(async (resolve) => {
      // const cacheKey = JSON.stringify({ planetId: window.location.pathname, params });

      // 🔹 Step 1: Try cache
      // here we get cache record once and keep reference to planetCache.
      // we then check for record with cacheKey
      // planetCache = await getPlanetCache(planetId); this should only happen on the first itteration. and reference
      // keep persistent reference to current planetCache in this file with usePlanetStore?
      // const cached = planetCache.current[cacheKey];

      // const cached = await getPlanetCache(cacheKey);
      // if (cached) {
      //   console.debug('getting mesh from cache')
      //   const geometry = new THREE.BufferGeometry();
      //   geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cached.positions), 3));
      //   geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(cached.normals), 3));
      //   geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cached.uvs), 2));
      //   geometry.setAttribute('elevation', new THREE.BufferAttribute(new Float32Array(cached.elevations), 1));
      //   geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(cached.indices), 1));

      //   geometry.computeBoundingBox?.();
      //   geometry.computeBoundingSphere?.();

      //   const mesh = new THREE.Mesh(geometry, this.material);
      //   buildBVHForMeshes(mesh);

      //   return resolve(geometry);
      // }

      // 🔹 Step 2: Otherwise queue worker task
      const vertexCount = (segments + 1) * (segments + 1);

      const posBuffer = this.getBuffer(this.posPool, vertexCount, 3 * Float32Array.BYTES_PER_ELEMENT);
      const normalBuffer = this.getBuffer(this.normalPool, vertexCount, 3 * Float32Array.BYTES_PER_ELEMENT);
      const elevationBuffer = this.getBuffer(this.elevationPool, vertexCount, Float32Array.BYTES_PER_ELEMENT);
      const uvBuffer = this.getBuffer(this.uvPool, vertexCount, 2 * Float32Array.BYTES_PER_ELEMENT);

      const task: Task = {
        posBuffer,
        normalBuffer,
        elevationBuffer,
        uvBuffer,
        planetSize,
        params,
        segments,
        resolve: async (geometry: THREE.BufferGeometry) => {
          // 🔹 Step 3: Save generated chunk to cache
          // in this step we should use current planet cache record and modify record.
          // setPlanetCache(planetId, { ...planetCache, cacheKey: {...}});
          // await setPlanetCache(cacheKey, {
          //   positions: geometry.attributes.position.array,
          //   normals: geometry.attributes.normal.array,
          //   uvs: geometry.attributes.uv.array,
          //   elevations: geometry.attributes.elevation.array,
          //   indices: geometry.index?.array,
          // });
          resolve(geometry);
        },
        ...(targetMesh ? { targetMesh } : {}),
      };

      this.queue.push(task);
      this.dispatch();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onWorkerDone(worker: Worker, data: any) {
    const task = (worker as any)._currentTask as Task;
    if (!task) return;

    const vertexCount = (task.segments + 1) * (task.segments + 1);

    // Rehydrate views
    const positions = new Float32Array(task.posBuffer);
    const normals = new Float32Array(task.normalBuffer);
    const elevations = new Float32Array(task.elevationBuffer);
    const uvs = new Float32Array(task.uvBuffer);

    let geometry: THREE.BufferGeometry;

    if (task.targetMesh) {
      // Update existing mesh
      geometry = task.targetMesh.geometry as THREE.BufferGeometry;
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geometry.setAttribute('elevation', new THREE.BufferAttribute(new Float32Array(elevations), 1));

      geometry.computeBoundingBox?.();
      geometry.computeBoundingSphere?.();

      if ((geometry as any).boundsTree) {
        (geometry as any).boundsTree.refit();
      } else {
        geometry.computeBoundsTree();
      }

      prepareMeshBounds(task.targetMesh);
      task.resolve(geometry);
      window.dispatchEvent(new Event('mesh-geometry-updated'));
    } else {
      // New geometry
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geometry.setAttribute('elevation', new THREE.BufferAttribute(new Float32Array(elevations), 1));

      // Index caching
      let index = this.indexCache.get(task.segments);
      if (!index) {
        const seg = task.segments;
        const rows = seg + 1;
        const cols = rows;
        const quadCount = seg * seg;
        const idxArr = new Uint32Array(quadCount * 6);
        let ptr = 0;
        for (let y = 0; y < seg; y++) {
          for (let x = 0; x < seg; x++) {
            const a = y * cols + x;
            const b = y * cols + (x + 1);
            const c = (y + 1) * cols + x;
            const d = (y + 1) * cols + (x + 1);
            idxArr[ptr++] = a; idxArr[ptr++] = c; idxArr[ptr++] = b;
            idxArr[ptr++] = b; idxArr[ptr++] = c; idxArr[ptr++] = d;
          }
        }
        index = idxArr;
        this.indexCache.set(task.segments, index);
      }
      geometry.setIndex(new THREE.BufferAttribute(index, 1));

      geometry.computeBoundingBox?.();
      geometry.computeBoundingSphere?.();

      const newMesh = new THREE.Mesh(geometry, this.material);
      newMesh.userData.isPlanet = true;
      buildBVHForMeshes(newMesh);

      task.resolve(geometry);

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
      geometry.attributes.uv.needsUpdate = true;
      geometry.attributes.elevation.needsUpdate = true;

      window.dispatchEvent(new Event('mesh-ready'));
    }

    // Return buffers to pool
    this.returnBuffer(this.posPool, vertexCount, task.posBuffer);
    this.returnBuffer(this.normalPool, vertexCount, task.normalBuffer);
    this.returnBuffer(this.elevationPool, vertexCount, task.elevationBuffer);
    this.returnBuffer(this.uvPool, vertexCount, task.uvBuffer);

    (worker as any)._currentTask = null;
    this.busyWorkers.delete(worker);
    this.dispatch();
  }

  private dispatch() {
    const worker = this.workers.find((w) => !this.busyWorkers.has(w) && this.workerReady.get(w));
    if (!worker || this.queue.length === 0) return;

    const task = this.queue.shift()!;
    this.busyWorkers.add(worker);

    worker.postMessage({
      type: 'build_chunk',
      payload: {
        elevationBuffer: task.elevationBuffer,
        posBuffer: task.posBuffer,
        normalBuffer: task.normalBuffer,
        uvBuffer: task.uvBuffer,
        planetSize: task.planetSize,
        params: task.params,
        segments: task.segments,
      },
    });

    (worker as any)._currentTask = task;
  }
}

export const planetWorkerPool = new PlanetWorkerPool();
