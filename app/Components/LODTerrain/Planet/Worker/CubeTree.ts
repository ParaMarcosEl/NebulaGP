'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from 'three';
import { PlanetMaterial } from './PlanetMaterial';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MeshBVH,
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';
import { PlanetCollisionRef } from '@/Controllers/Collision/usePlanetCollisions';
import { planetWorkerPool } from './PlanetWorkerPool';
import { FBMParams } from './fbm';

// Enable BVH support in three.js
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

type NoiseUniforms = FBMParams;

// Utility to convert FBMParams to PlanetUniforms
function fbmToUniforms(params: FBMParams): Record<string, { value: number }> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, { value: value as number }])
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
    registerPlanet?: (ref: PlanetCollisionRef) => void
  ): Promise<THREE.Mesh> {
    if (this.mesh) return this.mesh;

    const [bl, , tr] = this.bounds;
    const segments = 128;

    // Create material
    const material = new PlanetMaterial(lowTexture, midTexture, highTexture);
    material.customUniforms.uPlanetSize.value = planetSize;
    material.setParams(fbmToUniforms(uniforms));

    // Get geometry from worker pool
    const geometry = await planetWorkerPool.enqueue(segments, planetSize, material, { ...uniforms, useRidged: true });

    // Apply orientation
    const up = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    geometry.applyQuaternion(q);

    // Translate geometry into correct position
    const quadCenterX = (bl.x + tr.x) / 2;
    const quadCenterY = (bl.y + tr.y) / 2;
    const translation = new THREE.Vector3(quadCenterX, quadCenterY, 1);
    translation.applyQuaternion(q);
    translation.multiplyScalar(cubeSize / 2);
    geometry.translate(translation.x, translation.y, translation.z);
    geometry.computeBoundsTree();

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.userData.isPlanet = true;
    if (registerPlanet) registerPlanet({ current: this.mesh });

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
    registerPlanet?: (ref: PlanetCollisionRef) => void
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
          registerPlanet
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
          registerPlanet
        )
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
      [new THREE.Vector2(bl.x, midY), new THREE.Vector2(midX, midY), new THREE.Vector2(midX, tr.y), new THREE.Vector2(bl.x, tr.y)],
      // Top-right
      [new THREE.Vector2(midX, midY), new THREE.Vector2(tr.x, midY), new THREE.Vector2(tr.x, tr.y), new THREE.Vector2(midX, tr.y)],
      // Bottom-left
      [new THREE.Vector2(bl.x, bl.y), new THREE.Vector2(midX, bl.y), new THREE.Vector2(midX, midY), new THREE.Vector2(bl.x, midY)],
      // Bottom-right
      [new THREE.Vector2(midX, bl.y), new THREE.Vector2(tr.x, bl.y), new THREE.Vector2(tr.x, midY), new THREE.Vector2(midX, midY)],
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
    uniforms: NoiseUniforms
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
      uniforms
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
  faces: CubeFace[] = [];

  constructor(
    planetSize = 5,
    cubeSize = 5,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms
  ) {
    this.planetSize = planetSize;
    this.cubeSize = cubeSize;
    this.lowTexture = lowTexture;
    this.midTexture = midTexture;
    this.highTexture = highTexture;
    this.uniforms = uniforms;
    this.group = new THREE.Group();

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
    const meshes: THREE.Mesh[] = [];

    for (const face of this.faces) {
      const faceMeshes = await face.getMeshesAsync(
        this.planetSize,
        this.cubeSize,
        camera,
        maxDepth,
        this.lowTexture,
        this.midTexture,
        this.highTexture,
        this.uniforms
      );
      meshes.push(...faceMeshes);
    }

    if (this.group.children.length !== meshes.length) {
      this.group.clear();
      meshes.forEach((m) => this.group.add(m));
    }

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
          this.uniforms
        ))
      );
    }
    return meshes;
  }
}
