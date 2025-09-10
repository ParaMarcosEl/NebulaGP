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
    targetMesh?: THREE.Mesh,
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
      ...(targetMesh ? { targetMesh } : {}),
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
  const task = (worker as any)._currentTask as Task;
  if (!task) return;

  const positions = new Float32Array(task.posBuffer);
  const normals = new Float32Array(task.normalBuffer);
  const elevations = new Float32Array(task.elevationBuffer);
  const uvs = new Float32Array(task.uvBuffer);

  let geometry: THREE.BufferGeometry;
  let mesh: THREE.Mesh | undefined;

  if ('targetMesh' in task && task.targetMesh) {
    mesh = task.targetMesh as THREE.Mesh;
    geometry = mesh.geometry as THREE.BufferGeometry;

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const elevAttr = geometry.getAttribute('elevation') as THREE.BufferAttribute;

    // Ensure lengths match - if they don't, recreate the attributes
    if (posAttr.count * posAttr.itemSize !== positions.length) {
      posAttr.array = new Float32Array(positions.length); // fallback: recreate
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    } else {
      (posAttr.array as Float32Array).set(positions);
      posAttr.needsUpdate = true;
    }

    if (normAttr && normAttr.count * normAttr.itemSize === normals.length) {
      (normAttr.array as Float32Array).set(normals);
      normAttr.needsUpdate = true;
    } else {
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    }

    if (elevAttr && elevAttr.count * elevAttr.itemSize === elevations.length) {
      (elevAttr.array as Float32Array).set(elevations);
      elevAttr.needsUpdate = true;
    } else {
      geometry.setAttribute('elevation', new THREE.BufferAttribute(new Float32Array(elevations), 1));
    }

    // Recompute bounds and notify
    if (geometry.computeBoundingBox) geometry.computeBoundingBox();
    if (geometry.computeBoundingSphere) geometry.computeBoundingSphere();

    task.resolve(geometry);
    window.dispatchEvent(new Event('mesh-geometry-updated'));
  } else {
    // CREATE NEW GEOMETRY path (unchanged mostly)
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.setAttribute('elevation', new THREE.BufferAttribute(new Float32Array(elevations), 1));

    // index creation (same as your existing logic)
// Force index to always be Uint32Array
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

// Now index is guaranteed to be Uint32Array
geometry.setIndex(new THREE.BufferAttribute(index, 1));


    // compute bounds before BVH
    if (geometry.computeBoundingBox) geometry.computeBoundingBox();
    if (geometry.computeBoundingSphere) geometry.computeBoundingSphere();

    // create mesh
    const newMesh = new THREE.Mesh(geometry, this.material);
    newMesh.userData.isPlanet = true;

    // defer BVH build the same way
    const buildBVH = () => {
      if ((geometry as any).computeBoundsTree) (geometry as any).computeBoundsTree();
      newMesh.userData.hasBVH = true;
      window.dispatchEvent(new Event('mesh-bvh-updated'));
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(buildBVH, { timeout: 2000 });
    } else {
      setTimeout(buildBVH, 50);
    }

    task.resolve(geometry);
    window.dispatchEvent(new Event('mesh-geometry-updated'));
  }

  // cleanup
  (worker as any)._currentTask = null;
  this.busyWorkers.delete(worker);
  this.dispatch();
}



}

export const planetWorkerPool = new PlanetWorkerPool();
