import { BufferGeometry, BufferAttribute, Vector3 } from 'three';

// Utility: push vertices out to a proper cube-sphere
export function spherifyGeometry(geometry: BufferGeometry, radius: number) {
  const pos = geometry.attributes.position as BufferAttribute;
  const v = new Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Step 1: normalize to cube space (-1..1)
    // If your geometry is already in [-1,1] range (like your CubeTree quads),
    // you can skip dividing by len. But it's safer to rescale:
    const len = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    const cube = v.clone().divideScalar(len);

    // Step 2: map cube -> sphere
    const s = cubeToSphere(cube);

    // Step 3: scale to radius
    pos.setXYZ(i, s.x * radius, s.y * radius, s.z * radius);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function cubeToSphere(v: Vector3): Vector3 {
  const x = v.x;
  const y = v.y;
  const z = v.z;

  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;

  const sx = x * Math.sqrt(1 - y2 / 2 - z2 / 2 + (y2 * z2) / 3);
  const sy = y * Math.sqrt(1 - z2 / 2 - x2 / 2 + (z2 * x2) / 3);
  const sz = z * Math.sqrt(1 - x2 / 2 - y2 / 2 + (x2 * y2) / 3);

  return new Vector3(sx, sy, sz);
}
