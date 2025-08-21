import { useMemo, useState } from 'react';
import {QuadtreeNode} from './quadTree';
import { Face } from './Face';
import * as THREE from 'three';

// --- CubeTree.tsx ---
// This is the top-level component that manages the six faces of the cube.
export const CubeTree = ({ size = 10, position }: { size?: number, position: THREE.Vector3 | [number, number, number] }) => {
  // Use state to hold the quadtree for each face.
  const [faceQuadtrees] = useState(() => {
    const halfSize = size / 2;
    return [
      // For now, we only initialize and render the "top" face.
      { name: 'top', quadtree: new QuadtreeNode(new THREE.Vector2(0, 0), size) },
      // The other faces are initialized but not actively updated or rendered yet.
      // They will be implemented later.
      { name: 'front', quadtree: new QuadtreeNode(new THREE.Vector2(0, -halfSize), size) },
      { name: 'back', quadtree: new QuadtreeNode(new THREE.Vector2(0, halfSize), size) },
      { name: 'left', quadtree: new QuadtreeNode(new THREE.Vector2(-halfSize, 0), size) },
      { name: 'right', quadtree: new QuadtreeNode(new THREE.Vector2(halfSize, 0), size) },
      { name: 'bottom', quadtree: new QuadtreeNode(new THREE.Vector2(0, 0), size) },
    ];
  });

  const worldOrigin = useMemo(() => new THREE.Vector2(0, 0), []);

  return (
    <group position={position}>
      {faceQuadtrees.map((face) => (
        <Face
          key={face.name}
          quadtree={face.quadtree}
          // Set only the 'top' face to be active for now.
          active={face.name === 'top'}
          worldOrigin={worldOrigin}
        />
      ))}
    </group>
  );
};
