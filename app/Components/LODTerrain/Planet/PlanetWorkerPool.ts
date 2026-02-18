/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

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
  targetMesh?: THREE.Mesh;
};

class PlanetWorkerPool {
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerReady: Map<Worker, boolean> = new Map();
  private indexCache = new Map<number, Uint32Array>();
  private material: PlanetMaterial;

  // Attribute pools
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
        }
      };

      return worker;
    });
  }

  private getBuffer(
    pool: Map<number, SharedArrayBuffer[]>,
    vertexCount: number,
    bytesPerElement: number,
  ) {
    const arr = pool.get(vertexCount);
    if (arr && arr.length > 0) return arr.pop()!;
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

  // --- Preallocate geometry once ---
  private createOrReuseMesh(task: Task) {
    const vertexCount = (task.segments + 1) * (task.segments + 1);
    let geometry: THREE.BufferGeometry;
    let mesh: THREE.Mesh;

    if (task.targetMesh) {
      mesh = task.targetMesh;
      geometry = mesh.geometry as THREE.BufferGeometry;
    } else {
      geometry = new THREE.BufferGeometry();

      // Use SharedArrayBuffers directly
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(task.posBuffer), 3),
      );
      geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(task.normalBuffer), 3),
      );
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(task.uvBuffer), 2));
      geometry.setAttribute(
        'elevation',
        new THREE.BufferAttribute(new Float32Array(task.elevationBuffer), 1),
      );

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

      mesh = new THREE.Mesh(geometry, this.material);
      mesh.userData.isPlanet = true;
      buildBVHForMeshes(mesh);
    }

    return { mesh, geometry };
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

      const task: Task = {
        posBuffer: this.getBuffer(this.posPool, vertexCount, 3 * Float32Array.BYTES_PER_ELEMENT),
        normalBuffer: this.getBuffer(
          this.normalPool,
          vertexCount,
          3 * Float32Array.BYTES_PER_ELEMENT,
        ),
        elevationBuffer: this.getBuffer(
          this.elevationPool,
          vertexCount,
          Float32Array.BYTES_PER_ELEMENT,
        ),
        uvBuffer: this.getBuffer(this.uvPool, vertexCount, 2 * Float32Array.BYTES_PER_ELEMENT),
        planetSize,
        params,
        segments,
        resolve,
        targetMesh,
      };

      this.queue.push(task);
      this.dispatch();
    });
  }

  private onWorkerDone(worker: Worker, data: any) {
    const task = (worker as any)._currentTask as Task;
    if (!task) return;

    const { mesh, geometry } = this.createOrReuseMesh(task);

    // Directly update attributes (no allocations)
    (geometry.getAttribute('position') as THREE.BufferAttribute).array.set(
      new Float32Array(task.posBuffer),
    );
    (geometry.getAttribute('normal') as THREE.BufferAttribute).array.set(
      new Float32Array(task.normalBuffer),
    );
    (geometry.getAttribute('uv') as THREE.BufferAttribute).array.set(
      new Float32Array(task.uvBuffer),
    );
    (geometry.getAttribute('elevation') as THREE.BufferAttribute).array.set(
      new Float32Array(task.elevationBuffer),
    );

    // Mark for GPU update
    for (const name of ['position', 'normal', 'uv', 'elevation'] as const) {
      (geometry.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    }

    geometry.computeBoundingBox?.();
    geometry.computeBoundingSphere?.();

    if ((geometry as any).boundsTree) {
      (geometry as any).boundsTree.refit();
    } else {
      geometry.computeBoundsTree();
    }

    if (task.targetMesh) prepareMeshBounds(task.targetMesh);

    task.resolve(geometry);

    // Return buffers to pool
    const vertexCount = (task.segments + 1) * (task.segments + 1);
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
        posBuffer: task.posBuffer,
        normalBuffer: task.normalBuffer,
        elevationBuffer: task.elevationBuffer,
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
