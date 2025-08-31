'use client';

import React, { useMemo, forwardRef, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { TUBE_RADIUS } from '@/Constants';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { useCheckpointController } from '@/Controllers/Game/CheckPointController';
import { useLapTimer } from '@/Controllers/Game/LapTimer';
import { getShortestFlightPath } from '@/Lib/flightPath';
import CurveParticles from '../Particles/CurveParticles/CurveParticles';

// Setup BVH on BufferGeometry and raycasting
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const Track = forwardRef<
  THREE.Mesh,
  {
    aircraftRef: React.RefObject<THREE.Object3D>;
    curve: THREE.Curve<THREE.Vector3>;
    onLapComplete?: () => void;
  }
>(
  (
    {
      aircraftRef,
      curve,
      // onLapComplete,
    },
    ref,
  ) => {
    const checkpointMeshRef = useRef<THREE.Mesh | null>(null);

    useLapTimer();

    const checkpoint = useCheckpointController({
      aircraftRef,
      checkpointMeshRef: checkpointMeshRef as React.RefObject<THREE.Mesh>,
    });

    // Create tube geometry with BVH acceleration
    const geometry = useMemo(() => {
      const tubeGeometry = new THREE.TubeGeometry(curve, 400, TUBE_RADIUS, 16, true);
      tubeGeometry.computeBoundsTree();
      const shortestFlightPath = getShortestFlightPath(curve, TUBE_RADIUS);
      return { tubeGeometry, shortestFlightPath };
    }, [curve]);

    // Get points along the curve for rendering the line
    const curvePoints = useMemo(() => curve.getPoints(1000), [curve]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const shortestFlightPath = useMemo(
      () => geometry.shortestFlightPath.getPoints(2000),
      [geometry],
    );

    const { quaternion } = useMemo(() => {
      const tangent = curve.getTangentAt(0).normalize();

      // Default orientation of cylinder is Y-up. Compute rotation from Y-up to tangent.
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, tangent);

      return {
        quaternion,
      };
    }, [curve]);

    // Load and configure repeating texture for the playing field
    const texture = useTexture('/textures/stage_texture.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 1);

    return (
      <>
        {/* Render checkpoints as translucent spheres with color indication */}
        <mesh ref={checkpointMeshRef} position={curvePoints[0]} quaternion={quaternion}>
          <cylinderGeometry args={[35, 35, 1]} />
          <meshBasicMaterial
            color={!checkpoint.current.didPass ? 'green' : 'red'}
            transparent
            opacity={0.8}
            wireframe
          />
        </mesh>

        {/* Render the tube path line */}
        <CurveParticles particleSize={.3} orbitSpeed={3} tubeRadius={20} speed={.0} curve={curve} maxParticles={1500} />
        {/* <Line points={shortestFlightPath} color="#00ffff" lineWidth={2} dashed={false} /> */}

        {/* Render the tube mesh with texture */}
        <mesh ref={ref} geometry={geometry.tubeGeometry}>
          <meshStandardMaterial map={texture} side={THREE.BackSide} wireframe />
        </mesh>
      </>
    );
  },
);

Track.displayName = 'Track';

export default Track;

