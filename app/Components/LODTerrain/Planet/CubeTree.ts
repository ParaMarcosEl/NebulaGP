'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { PlanetMaterial } from './PlanetMaterial';
import { planetWorkerPool } from './PlanetWorkerPool';
import { FBMParams } from './fbm';
import { ensureBVH, prepareAndStoreMesh } from '@/Controllers/Game/usePlanetStore';
import { buildBVHForMeshes } from './LODPlanet';

type NoiseUniforms = FBMParams;

function fbmToUniforms(params: FBMParams): Record<string, { value: number }> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, { value: value as number }]),
  );
}

export function prepareMeshBounds(mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.BufferGeometry & { boundingBox?: THREE.Box3; boundingSphere?: THREE.Sphere };

  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();

  // Cache world-space bounds
  geometry.boundingBox!.applyMatrix4(mesh.matrixWorld);
  geometry.boundingSphere!.applyMatrix4(mesh.matrixWorld);
}


class QuadTreeNode {
  level: number;
  bounds: THREE.Vector2[];
  children: QuadTreeNode[] = [];
  mesh: THREE.Mesh | null = null;
  private isSubdivided = false; 
  private meshCache: Map<string, THREE.Mesh>;

  constructor(level: number, bounds: THREE.Vector2[], meshCache: Map<string, THREE.Mesh>) {
    this.level = level;
    this.bounds = bounds;
    this.meshCache = meshCache;
  }

  private getCacheKey(): string {
    const [bl, , tr] = this.bounds;
    return `${this.level}_${bl.x}_${bl.y}_${tr.x}_${tr.y}`;
  }

  async buildMeshAsync(
    normal: THREE.Vector3,
    planetSize: number,
    cubeSize: number,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms,
    addMesh?: (mesh: THREE.Mesh) => void
  ): Promise<THREE.Mesh> {
    const cacheKey = this.getCacheKey();
    if (this.meshCache.has(cacheKey)) {
      this.mesh = this.meshCache.get(cacheKey)!;
      return this.mesh;
    }
    if (this.mesh) return this.mesh;

    const [bl, , tr] = this.bounds;
    const segments = 64;

    const material = new PlanetMaterial(lowTexture, midTexture, highTexture);
    material.customUniforms.uPlanetSize.value = planetSize;
    material.setParams(fbmToUniforms(uniforms));

    // Worker builds displaced geometry
    const geometry = await planetWorkerPool.enqueue(segments, planetSize, material, {
      ...uniforms,
      useRidged: true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.userData.isPlanet = true;

    // Orientation
    const up = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    this.mesh.quaternion.copy(q);

    // Position in cube space
    const quadCenterX = (bl.x + tr.x) / 2;
    const quadCenterY = (bl.y + tr.y) / 2;
    const translation = new THREE.Vector3(quadCenterX, quadCenterY, 1);
    translation.applyQuaternion(q);
    translation.multiplyScalar(cubeSize / 2);
    this.mesh.position.copy(translation);

    // Apply transform to geometry so BVH matches world
    // this.mesh.updateMatrixWorld(true);
    // geometry.applyMatrix4(this.mesh.matrixWorld);

    // // Reset transform
    // this.mesh.position.set(0, 0, 0);
    // this.mesh.quaternion.identity();
    // this.mesh.scale.set(1, 1, 1);
    // this.mesh.updateMatrixWorld(true);

    prepareMeshBounds(this.mesh);
    buildBVHForMeshes(this.mesh);
    
    if (addMesh) addMesh(this.mesh);
    
    // Store in cache
    this.meshCache.set(cacheKey, this.mesh);
    
    window.dispatchEvent(new Event('mesh-ready'));
    return this.mesh;
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
  addMesh?: (mesh: THREE.Mesh) => void,
): Promise<void> {
  const [bl, , tr] = this.bounds;
  const center = new THREE.Vector3((bl.x + tr.x) / 2, (bl.y + tr.y) / 2, 1);
  const up = new THREE.Vector3(0, 0, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
  const quadWidth = tr.x - bl.x;
  const nodeSize = quadWidth * cubeSize;
  center.applyQuaternion(q);
  center.multiplyScalar(cubeSize / 2);
  center.addScaledVector(normal, cubeSize / 2);

  const dist = camera.position.distanceTo(center);

  // Replace simple distance threshold with screen-space error check
  const cameraFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
  const viewportHeight = window.innerHeight; 
  const projectedScreenSize = (nodeSize / dist) * (viewportHeight / (2 * Math.tan(cameraFov / 2)));
  const pixelThreshold = 100; // tweak for perf/quality

  if (this.level < maxDepth && projectedScreenSize > pixelThreshold) {
    this.subdivide();

    // 🔥 Collect child promises instead of awaiting one by one
    const promises = this.children.map((child) =>
      child.getMeshesAsync(
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
        addMesh
      )
    );

    await Promise.all(promises); // All children run in parallel
  } else {
    meshes.push(
      await this.buildMeshAsync(
        normal,
        planetSize,
        cubeSize,
        lowTexture,
        midTexture,
        highTexture,
        uniforms,
        addMesh
      )
    );
  }
}

  subdivide() {
    if (this.children.length > 0 || this.isSubdivided) return;
    const [bl, , tr] = this.bounds;
    const midX = (bl.x + tr.x) / 2;
    const midY = (bl.y + tr.y) / 2;

    const newBounds = [
      [new THREE.Vector2(bl.x, midY), new THREE.Vector2(midX, midY), new THREE.Vector2(midX, tr.y), new THREE.Vector2(bl.x, tr.y)],
      [new THREE.Vector2(midX, midY), new THREE.Vector2(tr.x, midY), new THREE.Vector2(tr.x, tr.y), new THREE.Vector2(midX, tr.y)],
      [new THREE.Vector2(bl.x, bl.y), new THREE.Vector2(midX, bl.y), new THREE.Vector2(midX, midY), new THREE.Vector2(bl.x, midY)],
      [new THREE.Vector2(midX, bl.y), new THREE.Vector2(tr.x, bl.y), new THREE.Vector2(tr.x, midY), new THREE.Vector2(midX, midY)],
    ];
    this.children = newBounds.map((bounds) => new QuadTreeNode(this.level + 1, bounds, this.meshCache));
  }
}

class CubeFace {
  normal: THREE.Vector3;
  root: QuadTreeNode;

  constructor(normal: THREE.Vector3, meshCache: Map<string, THREE.Mesh>) {
    this.normal = normal;
    this.root = new QuadTreeNode(0, [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(-1, 1),
    ], meshCache);
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
      addMesh
    );
    return meshes;
  }
}

export class CubeTree {
  private boundsCache: { mesh: THREE.Mesh; box: THREE.Box3; sphere: THREE.Sphere }[] = [];
  private meshCache: Map<string, THREE.Mesh> = new Map();
  private group: THREE.Group;
  private addMesh?: (mesh: THREE.Mesh) => void;
  faces: CubeFace[] = [];

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
  
  updateBoundsCache(meshes: THREE.Mesh[]) {
    this.boundsCache = meshes.map(m => {
      const g = m.geometry as THREE.BufferGeometry & { boundingBox: THREE.Box3; boundingSphere: THREE.Sphere };
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

  async getDynamicMeshesAsync(camera: THREE.Camera, maxDepth = 1): Promise<THREE.Group> {
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
          this.addMesh
        )
      )
    );

    const meshes = results.flat();
    this.group.clear();
    meshes.forEach((m) => {
      ensureBVH(m); // from usePlanetStore
      this.group.add(m);
    });

    this.updateBoundsCache(meshes);
    return this.group;
  }

  async getMeshesForBVH(camera: THREE.Camera, maxDepth = 1): Promise<THREE.Mesh[]> {
    const meshes: THREE.Mesh[] = [];
    for (const face of this.faces) {
      meshes.push(
        ...(await face.getMeshesAsync(
          this.planetSize,
          this.cubeSize,
          camera,
          maxDepth,
          this.lowTexture,
          this.midTexture,
          this.highTexture,
          this.uniforms,
        )),
      );
    }
    return meshes;
  }
}

