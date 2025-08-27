
import * as THREE from "three";

import { PlanetMaterial } from "./PlanetMaterial";





// Utility: push vertices out to a proper cube-sphere

export function spherifyGeometry(geometry: THREE.BufferGeometry, radius: number) {

  const pos = geometry.attributes.position as THREE.BufferAttribute;

  const v = new THREE.Vector3();



  for (let i = 0; i < pos.count; i++) {

    v.fromBufferAttribute(pos, i);

   

    // Normalize to a cube space where the largest component is 1

    const len = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));

    const cubeV = v.clone().divideScalar(len);



    // Map cube -> sphere using a computationally efficient approximation

    const sx = cubeV.x * Math.sqrt(1 - (cubeV.y * cubeV.y / 2) - (cubeV.z * cubeV.z / 2) + (cubeV.y * cubeV.y * cubeV.z * cubeV.z / 3));

    const sy = cubeV.y * Math.sqrt(1 - (cubeV.z * cubeV.z / 2) - (cubeV.x * cubeV.x / 2) + (cubeV.z * cubeV.z * cubeV.x * cubeV.x / 3));

    const sz = cubeV.z * Math.sqrt(1 - (cubeV.x * cubeV.x / 2) - (cubeV.y * cubeV.y / 2) + (cubeV.x * cubeV.x * cubeV.y * cubeV.y / 3));



    // Scale to the desired radius

    pos.setXYZ(i, sx * radius, sy * radius, sz * radius);

  }



  pos.needsUpdate = true;

  geometry.computeVertexNormals();

}



// Noise uniforms type

type NoiseUniforms = Partial<{

  uMaxHeight: number;

  uFrequency: number;

  uAmplitude: number;

  uOctaves: number;

  uLacunarity: number;

  uPersistence: number;

  uExponentiation: number;

}>;



class QuadTreeNode {

  level: number;

  bounds: THREE.Vector2[];

  children: QuadTreeNode[] = [];

  mesh: THREE.Mesh | null = null;



  constructor(level: number, bounds: THREE.Vector2[]) {

    this.level = level;

    this.bounds = bounds;

  }



  subdivide() {

    // ... keep your subdivision logic ...

  }



  buildMesh(

    normal: THREE.Vector3,

    planetSize: number,

    cubeSize: number,

    lowTexture: THREE.Texture,

    midTexture: THREE.Texture,

    highTexture: THREE.Texture,

    uniforms: NoiseUniforms

  ): THREE.Mesh {

    if (this.mesh) return this.mesh;



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



    const up = new THREE.Vector3(0, 0, 1);

    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);

    geometry.applyQuaternion(q);



    const quadCenterX = (bl.x + tr.x) / 2;

    const quadCenterY = (bl.y + tr.y) / 2;

    const translation = new THREE.Vector3(quadCenterX, quadCenterY, 1);

    translation.applyQuaternion(q);

    translation.multiplyScalar(cubeSize / 2);

    geometry.translate(translation.x, translation.y, translation.z);



    // 🔹 Convert to cube-sphere

    spherifyGeometry(geometry, planetSize);



    const material = new PlanetMaterial(undefined, lowTexture, midTexture, highTexture);



    // Pass uniforms from props

    material.customUniforms.uPlanetSize.value = planetSize;

    material.setParams(uniforms);



    this.mesh = new THREE.Mesh(geometry, material);

    return this.mesh;

  }



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

    uniforms: NoiseUniforms

  ): void {

    const [bl, , tr] = this.bounds;



    const center = new THREE.Vector3((bl.x + tr.x) / 2, (bl.y + tr.y) / 2, 1);



    const up = new THREE.Vector3(0, 0, 1);

    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);

    center.applyQuaternion(q);

    center.multiplyScalar(cubeSize / 2);

    center.addScaledVector(normal, cubeSize / 2);



    const dist = camera.position.distanceTo(center);



    if (this.level < maxDepth && dist < cubeSize * 2.5) {

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

          uniforms

        )

      );

    } else {

      meshes.push(

        this.buildMesh(

          normal,

          planetSize,

          cubeSize,

          lowTexture,

          midTexture,

          highTexture,

          uniforms

        )

      );

    }

  }

}



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



export class CubeTree {

  private planetSize: number;

  private cubeSize: number;

  private lowTexture: THREE.Texture;

  private midTexture: THREE.Texture;

  private highTexture: THREE.Texture;

  private uniforms: NoiseUniforms;

  faces: CubeFace[] = [];



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



  getDynamicMeshes(camera: THREE.Camera, maxDepth = 6): THREE.Group {

    const group = new THREE.Group();

    for (const face of this.faces) {

      const meshes = face.getMeshes(

        this.planetSize,

        this.cubeSize,

        camera,

        maxDepth,

        this.lowTexture,

        this.midTexture,

        this.highTexture,

        this.uniforms

      );

      meshes.forEach((mesh) => group.add(mesh));

    }

    return group;

  }

}
