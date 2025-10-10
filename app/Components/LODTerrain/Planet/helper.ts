import * as THREE from "three";

export function disposeMesh(mesh: THREE.Object3D) {
  mesh.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;

      // Dispose geometry
      if (m.geometry) {
        m.geometry.dispose();
      }

      // Dispose materials (array or single)
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => mat.dispose && mat.dispose());
      } else if (m.material) {
        m.material.dispose();
      }
    }
  });
}

export function clearGroup(group: THREE.Group) {
  group.children.forEach((child) => {
    disposeMesh(child);
  });
  group.clear();
}
