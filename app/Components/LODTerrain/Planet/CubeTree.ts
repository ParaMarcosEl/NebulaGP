'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { planetWorkerPool } from '../Planet/PlanetWorkerPool';
import { FBMParams } from './fbm';
import { prepareAndStoreMesh, usePlanetStore } from '@/Controllers/Game/usePlanetStore';
import { clearGroup, disposeMesh } from './helper';
import { getPlanetMaterialManager } from './PlanetMaterialManager';
import { geometryPool } from './GeometryPool';
import { bvhQueue } from './BVHQueue';

type NoiseUniforms = FBMParams;

function fbmToUniforms(params: FBMParams): Record<string, { value: number }> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, { value: value as number }]),
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function buildPlanetNodeMesh(nodeData: {
  segmentCount: any;
  lowTex: any;
  midTex: any;
  highTex: any;
  vertexData: any;
}) {
  const { segmentCount, lowTex, midTex, highTex, vertexData } = nodeData;
  const planetMaterialManager = getPlanetMaterialManager();
  // Get shared material
  const material = planetMaterialManager.getMaterial(lowTex, midTex, highTex);

  // Get or reuse geometry
  const geometry = geometryPool.getGeometry(segmentCount);

  // Fill geometry attributes from worker data
  geometry.setAttribute('position', new THREE.BufferAttribute(vertexData.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(vertexData.normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(vertexData.uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(vertexData.indices, 1));
  geometry.computeBoundingSphere();

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = true;

  // Optionally async BVH
  bvhQueue.enqueue(mesh);

  return mesh;
}

// When node is removed:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function releaseNodeMesh(mesh: THREE.Mesh) {
  geometryPool.releaseGeometry(mesh.geometry as THREE.BufferGeometry);
}

function getCameraFrustum(camera: THREE.Camera): THREE.Frustum {
  const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );

  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(projScreenMatrix);
  return frustum;
}

export function prepareMeshBounds(mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.BufferGeometry;

  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();

  const worldBox = geometry.boundingBox?.clone();
  const worldSphere = geometry.boundingSphere?.clone();
  if (!worldBox || !worldSphere) return;

  worldBox.applyMatrix4(mesh.matrixWorld);
  worldSphere.applyMatrix4(mesh.matrixWorld);

  mesh.userData.worldBoundingBox = worldBox;
  mesh.userData.worldBoundingSphere = worldSphere;
}

class QuadTreeNode {
  level: number;
  bounds: THREE.Vector2[];
  children: QuadTreeNode[] = [];
  mesh: THREE.Mesh | null = null;
  private isSubdivided = false;
  private planetMaterialManager = getPlanetMaterialManager();
  // meshCache now stores lastUsed metadata for LRU eviction
  private meshCache: Map<string, { mesh: WeakRef<THREE.Mesh>; lastUsed: number }>;

  private getSegmentsForDistance(projectedSize: number): number {
    if (projectedSize > 700) return 512;
    if (projectedSize > 500) return 256;
    if (projectedSize > 300) return 128;
    return 64;
  }

  constructor(
    level: number,
    bounds: THREE.Vector2[],
    meshCache: Map<string, { mesh: WeakRef<THREE.Mesh>; lastUsed: number }>,
  ) {
    this.level = level;
    this.bounds = bounds;
    this.meshCache = meshCache;
  }

  private getCacheKey(): string {
    const [bl, , tr] = this.bounds;
    return `${this.level}_${bl.x}_${bl.y}_${tr.x}_${tr.y}`;
  }

  // Dispose the current node's mesh (and remove from cache) if present.
  private disposeOwnMesh() {
    if (!this.mesh) return;
    // find the cacheKey and remove it
    const key = this.getCacheKey();
    if (this.meshCache.has(key)) {
      // dispose geometry/material and helpers
      const entry = this.meshCache.get(key)!;
      const mesh = entry?.mesh?.deref();
      if (!mesh) this.meshCache.delete(key);
      disposeMesh(mesh!);
      this.meshCache.delete(key);
    } else {
      disposeMesh(this.mesh);
    }
    this.mesh = null;
  }

  async buildMeshAsync(
    normal: THREE.Vector3,
    planetSize: number,
    cubeSize: number,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms,
    camera: THREE.Camera,
    projectedScreenSize: number,
    addMesh?: (mesh: THREE.Mesh) => void,
  ): Promise<THREE.Mesh> {
    const cacheKey = this.getCacheKey();
    if (this.meshCache.has(cacheKey)) {
      const entry = this.meshCache.get(cacheKey)!;
      entry.lastUsed = Date.now();
      this.mesh = entry.mesh.deref()!;
      return this.mesh;
    }

    if (this.mesh) return this.mesh;
    usePlanetStore.getState().incrementBuilds();

    try {
      const [bl, , tr] = this.bounds;
      const segments = this.getSegmentsForDistance(projectedScreenSize);
      // Reuse materials from the manager (shared per texture set)
      const material = getPlanetMaterialManager().getMaterial(lowTexture, midTexture, highTexture);
      material.customUniforms.uPlanetSize.value = planetSize;
      material.setParams(fbmToUniforms(uniforms));

      // Get pooled geometry
      const geometry = geometryPool.getGeometry(segments);

      // Generate vertex data from the worker
      const workerGeometry = await planetWorkerPool.enqueue(segments, planetSize, material, {
        ...uniforms,
        useRidged: true,
      });

      // Copy worker geometry attributes into pooled geometry
      geometry.copy(workerGeometry);
      geometry.computeBoundingSphere();

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.isPlanet = true;
      mesh.userData.sharedMaterial = true;


      // Orient and position
      const up = new THREE.Vector3(0, 0, 1);
      const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
      mesh.quaternion.copy(q);

      const quadCenterX = (bl.x + tr.x) / 2;
      const quadCenterY = (bl.y + tr.y) / 2;
      const translation = new THREE.Vector3(quadCenterX, quadCenterY, 1);
      translation.applyQuaternion(q);
      translation.multiplyScalar(cubeSize / 2);
      mesh.position.copy(translation);

      prepareMeshBounds(mesh);

      // Build BVH asynchronously (idle-safe)
      if (projectedScreenSize > 700) bvhQueue.enqueue(mesh);

      if (addMesh) addMesh(mesh);
      // store a WeakRef to allow LRU eviction without preventing GC
      this.meshCache.set(cacheKey, { mesh: new WeakRef(mesh), lastUsed: Date.now() });
      this.mesh = mesh;

      return mesh;
    } finally {
      usePlanetStore.getState().decrementBuilds();
    }
  }

  async getMeshesAsync(
    normal: THREE.Vector3,
    planetSize: number,
    cubeSize: number,
    camera: THREE.Camera,
    maxDepth: number,
    meshes: THREE.Mesh[],
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms,
    frustum: THREE.Frustum,
    addMesh?: (mesh: THREE.Mesh) => void,
  ): Promise<void> {
    const [bl, , tr] = this.bounds;

    const tmpCenter = new THREE.Vector3((bl.x + tr.x) / 2, (bl.y + tr.y) / 2, 1);
    const up = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);

    const quadWidth = tr.x - bl.x;
    const nodeSize = quadWidth * cubeSize;

    tmpCenter.applyQuaternion(q);
    tmpCenter.multiplyScalar(cubeSize / 2);
    tmpCenter.addScaledVector(normal, cubeSize / 2);

    const sphere = new THREE.Sphere(tmpCenter, nodeSize * 0.75);
    if (!frustum.intersectsSphere(sphere)) return;

    const dist = camera.position.distanceTo(tmpCenter);
    const cameraFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    const viewportHeight = window.innerHeight;
    const projectedScreenSize =
      (nodeSize / dist) * (viewportHeight / (2 * Math.tan(cameraFov / 2)));

    const pixelThreshold = 800;

    if (this.level < maxDepth && projectedScreenSize > pixelThreshold) {
      // subdividing — free parent's mesh immediately to reduce memory use
      if (!this.isSubdivided) {
        this.subdivide();
        // dispose parent's mesh if it exists. This ensures children take over detail.
        this.disposeOwnMesh();
        this.isSubdivided = true;
      }

      for (const child of this.children) {
        await child.getMeshesAsync(
          normal,
          planetSize,
          cubeSize,
          camera,
          maxDepth,
          meshes,
          lowTexture,
          midTexture,
          highTexture,
          uniforms,
          frustum,
          addMesh,
        );
      }
    } else {
      const mesh = await this.buildMeshAsync(
        normal,
        planetSize,
        cubeSize,
        lowTexture,
        midTexture,
        highTexture,
        uniforms,
        camera,
        projectedScreenSize,
        addMesh,
      );
      // mark used in cache if present
      const cacheKey = this.getCacheKey();
      if (this.meshCache.has(cacheKey)) {
        this.meshCache.get(cacheKey)!.lastUsed = Date.now();
      }
      meshes.push(mesh);
    }
  }

  subdivide() {
    if (this.children.length > 0) return;
    const [bl, , tr] = this.bounds;
    const midX = (bl.x + tr.x) / 2;
    const midY = (bl.y + tr.y) / 2;

    const newBounds = [
      [
        new THREE.Vector2(bl.x, midY),
        new THREE.Vector2(midX, midY),
        new THREE.Vector2(midX, tr.y),
        new THREE.Vector2(bl.x, tr.y),
      ],
      [
        new THREE.Vector2(midX, midY),
        new THREE.Vector2(tr.x, midY),
        new THREE.Vector2(tr.x, tr.y),
        new THREE.Vector2(midX, tr.y),
      ],
      [
        new THREE.Vector2(bl.x, bl.y),
        new THREE.Vector2(midX, bl.y),
        new THREE.Vector2(midX, midY),
        new THREE.Vector2(bl.x, midY),
      ],
      [
        new THREE.Vector2(midX, bl.y),
        new THREE.Vector2(tr.x, bl.y),
        new THREE.Vector2(tr.x, midY),
        new THREE.Vector2(midX, midY),
      ],
    ];
    this.children = newBounds.map(
      (bounds) => new QuadTreeNode(this.level + 1, bounds, this.meshCache),
    );
    if (this.mesh) {
      geometryPool.releaseGeometry(this.mesh.geometry as THREE.BufferGeometry);
      this.disposeOwnMesh();
    }
  }
}

class CubeFace {
  normal: THREE.Vector3;
  root: QuadTreeNode;

  constructor(
    normal: THREE.Vector3,
    meshCache: Map<string, { mesh: WeakRef<THREE.Mesh>; lastUsed: number }>,
  ) {
    this.normal = normal;
    this.root = new QuadTreeNode(
      0,
      [
        new THREE.Vector2(-1, -1),
        new THREE.Vector2(1, -1),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(-1, 1),
      ],
      meshCache,
    );
  }

  async getMeshesAsync(
    planetSize: number,
    cubeSize: number,
    camera: THREE.Camera,
    maxDepth: number,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms,
    frustum: THREE.Frustum,
    addMesh?: (mesh: THREE.Mesh) => void,
  ): Promise<THREE.Mesh[]> {
    const meshes: THREE.Mesh[] = [];
    await this.root.getMeshesAsync(
      this.normal,
      planetSize,
      cubeSize,
      camera,
      maxDepth,
      meshes,
      lowTexture,
      midTexture,
      highTexture,
      uniforms,
      frustum,
      addMesh,
    );
    return meshes;
  }
}

export class CubeTree {
  private boundsCache: { mesh: THREE.Mesh; box: THREE.Box3; sphere: THREE.Sphere }[] = [];
  // meshCache holds metadata now for LRU eviction
  private meshCache: Map<string, { mesh: WeakRef<THREE.Mesh>; lastUsed: number }> = new Map();
  private maxCacheSize = 500;

  private group: THREE.Group;
  private addMesh?: (mesh: THREE.Mesh) => void;
  faces: CubeFace[] = [];

  private _cubeTreeAlive = true;

  constructor(
    private planetSize = 5,
    private cubeSize = 5,
    private lowTexture: THREE.Texture,
    private midTexture: THREE.Texture,
    private highTexture: THREE.Texture,
    private uniforms: NoiseUniforms,
  ) {
    this.group = new THREE.Group();
    this.addMesh = prepareAndStoreMesh;

    const normals = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    this.faces = normals.map((n) => new CubeFace(n, this.meshCache));
  }

  markDead() {
    this._cubeTreeAlive = false;
  }
  get isAlive() {
    return this._cubeTreeAlive;
  }

  updateBoundsCache(meshes: THREE.Mesh[]) {
    this.boundsCache = meshes.map((m) => {
      const g = m.geometry as THREE.BufferGeometry & {
        boundingBox: THREE.Box3;
        boundingSphere: THREE.Sphere;
      };
      return { mesh: m, box: g.boundingBox.clone(), sphere: g.boundingSphere.clone() };
    });
  }

  getClosestCandidate(position: THREE.Vector3): THREE.Mesh | null {
    let closest: THREE.Mesh | null = null;
    let minDist = Infinity;

    for (const { mesh, sphere } of this.boundsCache) {
      const dist = position.distanceToSquared(sphere.center) - sphere.radius * sphere.radius;
      if (dist < minDist) {
        minDist = dist;
        closest = mesh;
      }
    }
    return closest;
  }
  
  private evictBatchSize = 5; // number of meshes to evict per call

private evictIfNeeded() {
  if (this.meshCache.size <= this.maxCacheSize) return;

  // Sort entries by lastUsed ascending (oldest first)
  const entries = Array.from(this.meshCache.entries()).sort(
    (a, b) => a[1].lastUsed - b[1].lastUsed
  );

  // Evict only a small batch at a time
  const toEvict = Math.min(entries.length, this.evictBatchSize);

  for (let i = 0; i < toEvict; i++) {
    const [key, entry] = entries[i];
    try {
      const mesh = entry.mesh.deref();
      if (mesh) {
        if (this.group.children.includes(mesh)) this.group.remove(mesh);
        disposeMesh(mesh);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // best-effort dispose
      try {
        disposeMesh(entry.mesh.deref()!);
      } catch {}
    }
    this.meshCache.delete(key);
  }
}


  async getDynamicMeshesAsync(camera: THREE.Camera, maxDepth = 1): Promise<THREE.Group> {
    const frustum = getCameraFrustum(camera);
    const results = await Promise.all(
      this.faces.map((face) =>
        face.getMeshesAsync(
          this.planetSize,
          this.cubeSize,
          camera,
          maxDepth,
          this.lowTexture,
          this.midTexture,
          this.highTexture,
          this.uniforms,
          frustum,
          this.addMesh,
        ),
      ),
    );
    const meshes = results.flat();
    clearGroup(this.group);
    meshes.forEach((m) => {
      if (!m.userData.bvhBuilt) {
        bvhQueue.enqueue(m); // don't await, async fire-and-forget
      }
      this.group.add(m);

      // mark mesh as recently used if cached
      // find its cache key by checking user data or using bounding boxes - we try to update cache by reference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, entry] of this.meshCache.entries()) {
        if (entry.mesh.deref() === m) {
          entry.lastUsed = Date.now();
          break;
        }
      }
    });

    this.updateBoundsCache(meshes);

    // Evict least-recently-used if over budget
    if (performance.now() % 5000 < 16) this.evictIfNeeded();

    return this.group;
  }

  async getMeshesForBVH(camera: THREE.Camera, maxDepth = 1): Promise<THREE.Mesh[]> {
    const frustum = getCameraFrustum(camera);
    const meshes: THREE.Mesh[] = [];
    for (const face of this.faces) {
      meshes.push(
        ...((await face.getMeshesAsync(
          this.planetSize,
          this.cubeSize,
          camera,
          maxDepth,
          this.lowTexture,
          this.midTexture,
          this.highTexture,
          this.uniforms,
          frustum,
          this.addMesh,
        )) as THREE.Mesh[]),
      );
    }
    return meshes;
  }

  dispose(): void {
    this.markDead();
    // dispose cache entries
    this.meshCache.forEach((entry) => {
      const mesh = entry.mesh.deref();
      if (mesh?.geometry) mesh?.geometry.dispose();
      if (Array.isArray(mesh?.material)) mesh?.material.forEach((m) => m.dispose());
      else (mesh?.material as THREE.Material)?.dispose();
      try {
        disposeMesh(entry.mesh.deref()!);
      } catch {}
    });

    this.meshCache.clear();
    this.boundsCache = [];
    this.lowTexture?.dispose();
    this.midTexture?.dispose();
    this.highTexture?.dispose();
    clearGroup(this.group);
    this.faces = [];
  }
}
