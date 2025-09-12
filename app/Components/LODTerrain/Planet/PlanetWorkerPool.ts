'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { FBMParams } from './fbm';
import { PlanetMaterial } from './PlanetMaterial';
import { buildBVHForMeshes } from './LODPlanet';
import { prepareMeshBounds } from './CubeTree';

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
  private indexCache = new Map<number, Uint32Array>();
  private material: PlanetMaterial;

  // New: buffer pools
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

  // Get buffer from pool or allocate new
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

  // Return buffer to pool
  private returnBuffer(
    pool: Map<number, SharedArrayBuffer[]>,
    vertexCount: number,
    buffer: SharedArrayBuffer,
  ) {
    if (!pool.has(vertexCount)) pool.set(vertexCount, []);
    pool.get(vertexCount)!.push(buffer);
  }

  enqueue(
    segments: number,
    planetSize: number,
    material: PlanetMaterial,
    params: FBMParams,
    targetMesh?: THREE.Mesh,
  ): Promise<THREE.BufferGeometry> {
    return new Promise((resolve) => {
      const vertexCount = (segments + 1) * (segments + 1);

      // Use buffer pool
      const posBuffer = this.getBuffer(
        this.posPool,
        vertexCount,
        3 * Float32Array.BYTES_PER_ELEMENT,
      );
      const normalBuffer = this.getBuffer(
        this.normalPool,
        vertexCount,
        3 * Float32Array.BYTES_PER_ELEMENT,
      );
      const elevationBuffer = this.getBuffer(
        this.elevationPool,
        vertexCount,
        Float32Array.BYTES_PER_ELEMENT,
      );
      const uvBuffer = this.getBuffer(this.uvPool, vertexCount, 2 * Float32Array.BYTES_PER_ELEMENT);

      const task: Task = {
        posBuffer,
        normalBuffer,
        elevationBuffer,
        uvBuffer,
        planetSize,
        params,
        segments,
        resolve,
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

    // Create typed views of worker buffers
    const positions = new Float32Array(task.posBuffer);
    const normals = new Float32Array(task.normalBuffer);
    const elevations = new Float32Array(task.elevationBuffer);
    const uvs = new Float32Array(task.uvBuffer);

    let geometry: THREE.BufferGeometry;
    let mesh: THREE.Mesh | undefined;

    if ('targetMesh' in task && task.targetMesh) {
      mesh = task.targetMesh as THREE.Mesh;
      geometry = mesh.geometry as THREE.BufferGeometry;

      // COPY data into new Float32Arrays to avoid overwriting active geometry
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geometry.setAttribute(
        'elevation',
        new THREE.BufferAttribute(new Float32Array(elevations), 1),
      );

      // Recompute bounds
      geometry.computeBoundingBox?.();
      geometry.computeBoundingSphere?.();

      // Refit BVH after attribute updates
      if ((geometry as any).boundsTree) {
        (geometry as any).boundsTree.refit();
      } else {
        geometry.computeBoundsTree();
      }

      prepareMeshBounds(mesh);
      task.resolve(geometry);
      window.dispatchEvent(new Event('mesh-geometry-updated'));
    } else {
      // NEW geometry path
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geometry.setAttribute(
        'elevation',
        new THREE.BufferAttribute(new Float32Array(elevations), 1),
      );

      // index creation (cached)
      let index = this.indexCache.get(task.segments);
      if (!index) {
        const segments = task.segments;
        const rows = segments + 1;
        const cols = rows;
        const quadCount = segments * segments;
        const idxArr = new Uint32Array(quadCount * 6);
        let ptr = 0;
        for (let y = 0; y < segments; y++) {
          for (let x = 0; x < segments; x++) {
            const a = y * cols + x;
            const b = y * cols + (x + 1);
            const c = (y + 1) * cols + x;
            const d = (y + 1) * cols + (x + 1);
            idxArr[ptr++] = a;
            idxArr[ptr++] = c;
            idxArr[ptr++] = b;
            idxArr[ptr++] = b;
            idxArr[ptr++] = c;
            idxArr[ptr++] = d;
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

    // **Return buffers to pool AFTER copying**
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
