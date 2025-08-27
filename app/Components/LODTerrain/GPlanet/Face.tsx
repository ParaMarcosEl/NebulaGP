import { useFrame, useThree } from '@react-three/fiber';
import { useState } from 'react';
import { QuadtreeNode } from './quadTree';
import { Chunk } from './Chunk';
import * as THREE from 'three';

interface IFaceProps {
  quadtree: QuadtreeNode;
  active: boolean; // Only active faces will update their quadtree.
  worldOrigin: THREE.Vector2;
}

export const Face = ({ quadtree, active, worldOrigin }: IFaceProps) => {
  const [leafNodes, setLeafNodes] = useState<QuadtreeNode[]>([]);
  const { camera } = useThree();

  // Update the quadtree and get the leaf nodes every frame if the face is active.
  useFrame(() => {
    if (active) {
      quadtree.splitNearCamera(camera.position, 1.5, 5); // Example thresholds.
      quadtree.mergeIfFar(camera.position, 1.5);
      setLeafNodes(quadtree.getLeafNodes());
    }
  });

  return (
    <group>
      {leafNodes.map((node, index) => (
        <Chunk key={index} node={node} worldOrigin={worldOrigin} />
      ))}
    </group>
  );
};
