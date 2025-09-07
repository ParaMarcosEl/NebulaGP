// Imports necessary libraries from three.js and other local modules.
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
import { fbm, FBMParams } from './fbm'; // Helper function for Fractal Brownian Motion (FBM).

// Patch THREE.BufferGeometry and THREE.Mesh prototypes to enable BVH support.
// This is done once at the application's start to optimize raycasting.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// === Geometry Spherify with FBM displacement ===

/**
 * Transforms a flat geometry (like a plane) into a spherical shape and applies
 * FBM displacement to create a terrain-like surface.
 * @param geometry The THREE.BufferGeometry to modify.
 * @param radius The base radius of the planet.
 * @param uniforms Optional FBM parameters to control the terrain generation.
 */
export function spherifyGeometry(
  geometry: THREE.BufferGeometry,
  radius: number,
  uniforms?: FBMParams
) {
  // Get the position attribute of the geometry.
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();

  // Iterate over each vertex to spherify it and apply displacement.
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Cube -> sphere approximation: a common technique to create a smooth sphere from a cube.
    // It involves normalizing the vector and then applying a formula to push vertices outward.
    const len = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    const cubeV = v.clone().divideScalar(len);
    const sx =
      cubeV.x *
      Math.sqrt(1 - (cubeV.y ** 2) / 2 - (cubeV.z ** 2) / 2 + (cubeV.y ** 2 * cubeV.z ** 2) / 3);
    const sy =
      cubeV.y *
      Math.sqrt(1 - (cubeV.z ** 2) / 2 - (cubeV.x ** 2) / 2 + (cubeV.z ** 2 * cubeV.x ** 2) / 3);
    const sz =
      cubeV.z *
      Math.sqrt(1 - (cubeV.x ** 2) / 2 - (cubeV.y ** 2) / 2 + (cubeV.x ** 2 * cubeV.y ** 2) / 3);
    v.set(sx, sy, sz);

    // Apply FBM (Fractal Brownian Motion) displacement if uniforms are provided.
    // This creates the bumpy, procedural terrain.
    if (uniforms) {
      const disp = fbm(v, uniforms);
      v.multiplyScalar(radius + disp);
    } else {
      // If no uniforms, just create a smooth sphere.
      v.multiplyScalar(radius);
    }

    // Update the vertex position in the geometry's buffer.
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  // Signal Three.js that the vertex positions have been updated.
  pos.needsUpdate = true;
  // Recalculate normals after changing vertex positions for correct lighting.
  geometry.computeVertexNormals();
}

// === QuadTreeNode ===

type NoiseUniforms = Partial<FBMParams>;

/**
 * Represents a node in the quadtree for a single cube face.
 * It's responsible for managing a section of the planet's surface and implementing LOD.
 */
class QuadTreeNode {
  level: number; // The subdivision level of this node.
  bounds: THREE.Vector2[]; // The 2D bounds of this node on the cube face.
  children: QuadTreeNode[] = []; // Sub-nodes if this node is subdivided.
  mesh: THREE.Mesh | null = null; // The THREE.Mesh for this node if it's not subdivided.

  constructor(level: number, bounds: THREE.Vector2[]) {
    this.level = level;
    this.bounds = bounds;
  }

  /**
   * Builds and returns a THREE.Mesh for this node's section of the planet.
   * This is called when the node is not subdivided further.
   * @param normal The normal vector of the cube face this node belongs to.
   * @param planetSize The base planet radius.
   * @param cubeSize The size of the initial cube face.
   * @param lowTexture, midTexture, highTexture Textures for different terrain heights.
   * @param uniforms FBM parameters for displacement.
   * @param registerPlanet Optional callback to register the mesh for collision detection.
   */
  buildMesh(
    normal: THREE.Vector3,
    planetSize: number,
    cubeSize: number,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms,
    registerPlanet?: (ref: PlanetCollisionRef) => void
  ): THREE.Mesh {
    // Return the existing mesh if it's already built.
    if (this.mesh) return this.mesh;

    // Calculate dimensions and create a new plane geometry.
    const [bl, , tr] = this.bounds;
    const quadWidth = tr.x - bl.x;
    const quadHeight = tr.y - bl.y;
    const segments = 128;
    const geometry = new THREE.PlaneGeometry(
      quadWidth * cubeSize,
      quadHeight * cubeSize,
      segments,
      segments
    );

    // Orient and translate the plane to match its position and orientation on the cube face.
    const up = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    geometry.applyQuaternion(q);
    const quadCenterX = (bl.x + tr.x) / 2;
    const quadCenterY = (bl.y + tr.y) / 2;
    const translation = new THREE.Vector3(quadCenterX, quadCenterY, 1);
    translation.applyQuaternion(q);
    translation.multiplyScalar(cubeSize / 2);
    geometry.translate(translation.x, translation.y, translation.z);

    // Apply the spherification and FBM displacement.
    spherifyGeometry(geometry, planetSize, {
      uMaxHeight: uniforms.uMaxHeight ?? 150,
      uFrequency: uniforms.uFrequency ?? 15,
      uAmplitude: uniforms.uAmplitude ?? 3,
      uOctaves: uniforms.uOctaves ?? 10,
      uLacunarity: uniforms.uLacunarity ?? 3,
      uPersistence: uniforms.uPersistence ?? .15,
      uExponentiation: uniforms.uExponentiation ?? 6,
    });

    // Create a custom material and mesh, then store it.
    const material = new PlanetMaterial(undefined, lowTexture, midTexture, highTexture);
    material.customUniforms.uPlanetSize.value = planetSize;
    material.setParams(uniforms);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.userData.isPlanet = true;
    if (registerPlanet) registerPlanet({ current: this.mesh });
    return this.mesh;
  }

  /**
   * Recursively gets the meshes for this node and its children based on camera distance.
   * This is the main LOD logic.
   * @param normal The cube face normal.
   * @param planetSize The base planet radius.
   * @param cubeSize The initial cube size.
   * @param camera The current camera.
   * @param maxDepth The maximum subdivision level.
   * @param meshes An array to store the final meshes.
   * @param lowTexture, midTexture, highTexture Textures for different terrain heights.
   * @param uniforms FBM parameters.
   * @param registerPlanet Optional callback for collision.
   */
  getMeshes(
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
  ): void {
    const [bl, , tr] = this.bounds;

    // Calculate the world-space center of the quad node.
    const center = new THREE.Vector3((bl.x + tr.x) / 2, (bl.y + tr.y) / 2, 1);
    const up = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    const quadWidth = tr.x - bl.x;
    const nodeSize = quadWidth * cubeSize;
    center.applyQuaternion(q);
    center.multiplyScalar(cubeSize / 2);
    center.addScaledVector(normal, cubeSize / 2);

    // Get the distance from the camera to the node's center.
    const dist = camera.position.distanceTo(center);
    const threshold = nodeSize * 1.5;

    // LOD Decision Logic:
    // If the node is not at max depth and the camera is close, subdivide and recurse.
    if (this.level < maxDepth && dist < threshold) {
      this.subdivide();
      this.children.forEach((child) =>
        child.getMeshes(
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
        )
      );
    } else {
      // If the camera is far or at max depth, build and add the mesh for this node.
      meshes.push(
        this.buildMesh(
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
   * Subdivides the current node into four children nodes.
   */
  subdivide() {
    if (this.children.length > 0) return; // Already subdivided.
    const [bl, , tr] = this.bounds;
    const midX = (bl.x + tr.x) / 2;
    const midY = (bl.y + tr.y) / 2;
    // Define the bounds for the four new child nodes.
    const newBounds = [
      // Top-left quad
      [new THREE.Vector2(bl.x, midY), new THREE.Vector2(midX, midY), new THREE.Vector2(midX, tr.y), new THREE.Vector2(bl.x, tr.y)],
      // Top-right quad
      [new THREE.Vector2(midX, midY), new THREE.Vector2(tr.x, midY), new THREE.Vector2(tr.x, tr.y), new THREE.Vector2(midX, tr.y)],
      // Bottom-left quad
      [new THREE.Vector2(bl.x, bl.y), new THREE.Vector2(midX, bl.y), new THREE.Vector2(midX, midY), new THREE.Vector2(bl.x, midY)],
      // Bottom-right quad
      [new THREE.Vector2(midX, bl.y), new THREE.Vector2(tr.x, bl.y), new THREE.Vector2(tr.x, midY), new THREE.Vector2(midX, midY)],
    ];
    // Create new QuadTreeNode instances for each set of bounds.
    this.children = newBounds.map((bounds) => new QuadTreeNode(this.level + 1, bounds));
  }
}

// === CubeFace & CubeTree ===

/**
 * Represents one of the six faces of the cube used to construct the planet.
 * Each face has its own root quadtree.
 */
class CubeFace {
  normal: THREE.Vector3; // The normal vector of the face (e.g., (1, 0, 0) for the positive X face).
  root: QuadTreeNode; // The root node of the quadtree for this face.

  constructor(normal: THREE.Vector3) {
    this.normal = normal;
    // The root node covers the entire face, from (-1, -1) to (1, 1).
    this.root = new QuadTreeNode(0, [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(-1, 1),
    ]);
  }

  /**
   * Retrieves all visible meshes for this face by traversing the quadtree.
   * @param planetSize The base planet radius.
   * @param cubeSize The size of the initial cube.
   * @param camera The current camera.
   * @param maxDepth The maximum subdivision depth.
   * @param lowTexture, midTexture, highTexture Textures for different terrain heights.
   * @param uniforms FBM parameters.
   * @returns An array of THREE.Mesh objects to be rendered.
   */
  getMeshes(
    planetSize: number,
    cubeSize: number,
    camera: THREE.Camera,
    maxDepth: number,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms
  ): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    // Start the recursive mesh gathering from the root node.
    this.root.getMeshes(
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
 * The main class that creates and manages the entire planet.
 * It's responsible for generating and updating the cube faces and their quadtrees.
 */
export class CubeTree {
  private planetSize: number;
  private cubeSize: number;
  private lowTexture: THREE.Texture;
  private midTexture: THREE.Texture;
  private highTexture: THREE.Texture;
  private uniforms: NoiseUniforms;
  private group: THREE.Group; // A group to hold all the rendered meshes for easy addition to the scene.
  faces: CubeFace[] = []; // The six faces of the cube.

  constructor(
    planetSize = 5,
    cubeSize = 5,
    lowTexture: THREE.Texture,
    midTexture: THREE.Texture,
    highTexture: THREE.Texture,
    uniforms: NoiseUniforms = {}
  ) {
    this.planetSize = planetSize;
    this.cubeSize = cubeSize;
    this.lowTexture = lowTexture;
    this.midTexture = midTexture;
    this.highTexture = highTexture;
    this.uniforms = uniforms;
    this.group = new THREE.Group();

    // Define the six normal vectors for the cube faces.
    const normals = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    // Create a CubeFace instance for each normal vector.
    this.faces = normals.map((n) => new CubeFace(n));
  }

  /**
   * Gathers all meshes from all six faces based on the current camera position.
   * @param camera The current camera.
   * @param maxDepth The maximum subdivision depth.
   * @returns An array of meshes.
   */
  private gatherMeshes(camera: THREE.Camera, maxDepth = 1): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    // Iterate through each face and collect its meshes.
    for (const face of this.faces) {
      meshes.push(
        ...face.getMeshes(
          this.planetSize,
          this.cubeSize,
          camera,
          maxDepth,
          this.lowTexture,
          this.midTexture,
          this.highTexture,
          this.uniforms
        )
      );
    }
    return meshes;
  }

  /**
   * Returns a THREE.Group containing the dynamically generated meshes.
   * This method is designed to be called in the render loop.
   * It checks if the set of meshes has changed and updates the group accordingly.
   * @param camera The current camera.
   * @param maxDepth The maximum subdivision depth.
   * @returns A THREE.Group containing the current visible meshes.
   */
  getDynamicMeshes(camera: THREE.Camera, maxDepth = 1): THREE.Group {
    const meshes = this.gatherMeshes(camera, maxDepth);
    // If the number of meshes has changed, it means the LOD has changed.
    // Clear the old meshes and add the new ones to the group.
    if (this.group.children.length !== meshes.length) {
      this.group.clear();
      meshes.forEach((m) => this.group.add(m));
    }
    return this.group;
  }

  /**
   * A helper method to get all the meshes for BVH (Bounding Volume Hierarchy) computation.
   * This is useful for collision detection, as it provides a single array of all meshes.
   * @param camera The current camera.
   * @param maxDepth The maximum subdivision depth.
   * @returns An array of THREE.Mesh objects.
   */
  getMeshesForBVH(camera: THREE.Camera, maxDepth = 1): THREE.Mesh[] {
    return this.gatherMeshes(camera, maxDepth);
  }
}