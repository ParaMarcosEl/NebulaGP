'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { PlanetMaterial } from './PlanetMaterial';
import { planetWorkerPool } from './PlanetWorkerPool';
import { FBMParams } from './fbm';
import { prepareAndStoreMesh } from '@/Controllers/Game/usePlanetStore';

type NoiseUniforms = FBMParams;

// Utility to convert FBMParams to PlanetUniforms
function fbmToUniforms(params: FBMParams): Record<string, { value: number }> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, { value: value as number }]),
  );
}

/**
 * QuadTreeNode: A single node in the quadtree structure for a cube face.
 */
class QuadTreeNode {
  level: number;
  bounds: THREE.Vector2[];
  children: QuadTreeNode[] = [];
  mesh: THREE.Mesh | null = null;

  constructor(level: number, bounds: THREE.Vector2[]) {
    this.level = level;
    this.bounds = bounds;
  }

  /**
   * Builds mesh for this quadtree node asynchronously using the worker pool.
   */
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
  if (this.mesh) return this.mesh;

  const [bl, , tr] = this.bounds;
  const segments = 64;

  const material = new PlanetMaterial(lowTexture, midTexture, highTexture);
  material.customUniforms.uPlanetSize.value = planetSize;
  material.setParams(fbmToUniforms(uniforms));

  // ⬇️ Worker returns FULLY DISPLACED geometry
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

  const quadCenterX = (bl.x + tr.x) / 2;
  const quadCenterY = (bl.y + tr.y) / 2;
  const translation = new THREE.Vector3(quadCenterX, quadCenterY, 1);
  translation.applyQuaternion(q);
  translation.multiplyScalar(cubeSize / 2);
  this.mesh.position.copy(translation);

  // ✅ Apply transform to geometry so BVH matches world position
  this.mesh.updateMatrixWorld(true);
  geometry.applyMatrix4(this.mesh.matrixWorld);

  // Reset transform to identity
  this.mesh.position.set(0, 0, 0);
  this.mesh.quaternion.identity();
  this.mesh.scale.set(1, 1, 1);
  this.mesh.updateMatrixWorld(true);

  // 🚀 Add to store AFTER BVH
  if (addMesh) addMesh(this.mesh);

  return this.mesh;
}


  /**
   * Recursively collect meshes based on LOD and camera distance (async).
   */
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

    // Compute node center in world space
    const center = new THREE.Vector3((bl.x + tr.x) / 2, (bl.y + tr.y) / 2, 1);
    const up = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    const quadWidth = tr.x - bl.x;
    const nodeSize = quadWidth * cubeSize;
    center.applyQuaternion(q);
    center.multiplyScalar(cubeSize / 2);
    center.addScaledVector(normal, cubeSize / 2);

    const dist = camera.position.distanceTo(center);
    const threshold = nodeSize * 1.5;

    if (this.level < maxDepth && dist < threshold) {
      this.subdivide();
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
          addMesh,
        );
      }
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
          addMesh,
        ),
      );
    }
  }

  /**
   * Subdivide this node into four children.
   */
  subdivide() {
    if (this.children.length > 0) return;
    const [bl, , tr] = this.bounds;
    const midX = (bl.x + tr.x) / 2;
    const midY = (bl.y + tr.y) / 2;

    const newBounds = [
      // Top-left
      [
        new THREE.Vector2(bl.x, midY),
        new THREE.Vector2(midX, midY),
        new THREE.Vector2(midX, tr.y),
        new THREE.Vector2(bl.x, tr.y),
      ],
      // Top-right
      [
        new THREE.Vector2(midX, midY),
        new THREE.Vector2(tr.x, midY),
        new THREE.Vector2(tr.x, tr.y),
        new THREE.Vector2(midX, tr.y),
      ],
      // Bottom-left
      [
        new THREE.Vector2(bl.x, bl.y),
        new THREE.Vector2(midX, bl.y),
        new THREE.Vector2(midX, midY),
        new THREE.Vector2(bl.x, midY),
      ],
      // Bottom-right
      [
        new THREE.Vector2(midX, bl.y),
        new THREE.Vector2(tr.x, bl.y),
        new THREE.Vector2(tr.x, midY),
        new THREE.Vector2(midX, midY),
      ],
    ];
    this.children = newBounds.map((bounds) => new QuadTreeNode(this.level + 1, bounds));
  }
}

/**
 * CubeFace: Represents one cube face of the planet.
 */
class CubeFace {
  normal: THREE.Vector3;
  root: QuadTreeNode;

  constructor(normal: THREE.Vector3) {
    this.normal = normal;
    this.root = new QuadTreeNode(0, [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(-1, 1),
    ]);
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

/**
 * CubeTree: Manages the entire planet composed of 6 cube faces.
 */
export class CubeTree {
  private planetSize: number;
  private cubeSize: number;
  private lowTexture: THREE.Texture;
  private midTexture: THREE.Texture;
  private highTexture: THREE.Texture;
  private uniforms: NoiseUniforms;
  private group: THREE.Group;
  private addMesh?: (mesh: THREE.Mesh) => void;
  faces: CubeFace[] = [];

  constructor(
    planetSize = 5,
    cubeSize = 5,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms,
  ) {
    this.planetSize = planetSize;
    this.cubeSize = cubeSize;
    this.lowTexture = lowTexture;
    this.midTexture = midTexture;
    this.highTexture = highTexture;
    this.uniforms = uniforms;
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
    this.faces = normals.map((n) => new CubeFace(n));
  }

  /**
   * Build/update meshes for all faces asynchronously.
   */

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

  // Refresh group
  this.group.clear();
  meshes.forEach((m) => this.group.add(m));

  // Collect only meshes with BVH
  const collected: THREE.Mesh[] = [];
  this.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && (mesh.geometry as any).boundsTree) {
      collected.push(mesh);
    }
  });

  //  Update store

  return this.group;
}


  /**
   * Get all meshes for BVH (collision) asynchronously.
   */
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
