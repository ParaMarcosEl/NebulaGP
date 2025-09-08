'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { FBMParams } from './fbm';
import { PlanetMaterial } from './PlanetMaterial';

type Task = {
  posBuffer: SharedArrayBuffer;
  normalBuffer: SharedArrayBuffer;
  elevationBuffer: SharedArrayBuffer;
  uvBuffer: SharedArrayBuffer;
  planetSize: number;
  params: FBMParams;
  segments: number;
  resolve: (geometry: THREE.BufferGeometry) => void;
};

class PlanetWorkerPool {
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerReady: Map<Worker, boolean> = new Map();
  // cache index arrays by segments
  private indexCache = new Map<number, Uint32Array>();
  private material: PlanetMaterial;

  constructor(
    workerCount = navigator.hardwareConcurrency || 4,
    material = new PlanetMaterial(new THREE.Texture(), new THREE.Texture(), new THREE.Texture()),
  ) {
    this.material = material;
    this.workers = Array.from({ length: workerCount }, () => {
      const worker = new Worker(new URL('@/workers/PlanetWorker.worker.ts', import.meta.url), {
        type: 'module',
      });

      // Initially mark as not ready
      this.workerReady.set(worker, false);

      worker.onmessage = (e) => {
        switch (e.data.type) {
          case 'ready':
            console.log('Worker ready:', worker);
            this.workerReady.set(worker, true);
            this.dispatch(); // Try to dispatch queued tasks
            break;
          case 'pong':
            console.log('Worker pong received');
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

  /**
   * Enqueue a grid request. segments = number of subdivisions along one edge (like PlaneGeometry segments).
   * vertexCount used by worker should be (segments+1)*(segments+1)
   */
  enqueue(
    segments: number,
    planetSize: number,
    material: PlanetMaterial,
    params: FBMParams,
  ): Promise<THREE.BufferGeometry> {
    return new Promise((resolve) => {
      const vertexCount = (segments + 1) * (segments + 1);
      const posBuffer = new SharedArrayBuffer(vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT);
      const elevationBuffer = new SharedArrayBuffer(vertexCount * Float32Array.BYTES_PER_ELEMENT);
      const normalBuffer = new SharedArrayBuffer(vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT);
      const uvBuffer = new SharedArrayBuffer(vertexCount * 2 * Float32Array.BYTES_PER_ELEMENT);

      const task: Task = {
        posBuffer,
        elevationBuffer,
        normalBuffer,
        uvBuffer,
        planetSize,
        params,
        segments,
        resolve,
      };
      this.queue.push(task);
      this.dispatch();
    });
  }

  private dispatch() {
    // find a ready and idle worker
    const worker = this.workers.find((w) => !this.busyWorkers.has(w) && this.workerReady.get(w));
    if (!worker || this.queue.length === 0) return;

    const task = this.queue.shift()!;
    this.busyWorkers.add(worker);

    // send the task, including segments so worker can build a deterministic grid
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onWorkerDone(worker: Worker, data: any) {
    const { maxElevation, minElevation } = data;
    // get the task stored on the worker
    const task = (worker as any)._currentTask as Task;
    if (!task) return;

    // Create typed arrays that share the underlying shared buffers
    const positions = new Float32Array(task.posBuffer);
    const elevations = new Float32Array(task.elevationBuffer);
    const normals = new Float32Array(task.normalBuffer);
    const uvs = new Float32Array(task.uvBuffer);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('elevation', new THREE.BufferAttribute(elevations, 1));
    this.material.setParams({
      uMaxElevation: maxElevation,
      uMinElevation: minElevation,
    });

    // set index: reuse cached index for given segments
    const segments = task.segments;
    let index = this.indexCache.get(segments);
    if (!index) {
      // generate indices for (segments+1) x (segments+1) grid
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const rows = segments + 1;
      const cols = segments + 1;
      const quadCount = segments * segments;
      const idxArr = new Uint32Array(quadCount * 6); // 6 indices per quad (two triangles)
      let ptr = 0;
      for (let y = 0; y < segments; y++) {
        for (let x = 0; x < segments; x++) {
          const a = y * cols + x;
          const b = y * cols + (x + 1);
          const c = (y + 1) * cols + x;
          const d = (y + 1) * cols + (x + 1);
          // triangle a, c, b  and  b, c, d  (or any consistent winding)
          idxArr[ptr++] = a;
          idxArr[ptr++] = c;
          idxArr[ptr++] = b;
          idxArr[ptr++] = b;
          idxArr[ptr++] = c;
          idxArr[ptr++] = d;
        }
      }
      index = idxArr;
      this.indexCache.set(segments, index);
    }

    geometry.setIndex(new THREE.BufferAttribute(index, 1));

    // resolve the geometry
    task.resolve(geometry);

    // cleanup
    (worker as any)._currentTask = null;
    this.busyWorkers.delete(worker);
    this.dispatch();
  }
}

export const planetWorkerPool = new PlanetWorkerPool();
