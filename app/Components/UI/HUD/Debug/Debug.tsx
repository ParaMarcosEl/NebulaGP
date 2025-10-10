'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useState } from 'react';
import * as THREE from 'three';

function useMemoryStats() {
  const { gl, scene } = useThree();
  const [stats, setStats] = useState({ geo: 0, mat: 0, tex: 0 });

  useFrame(() => {
    const info = gl.info;

    const geo = info.memory.geometries;
    const tex = info.memory.textures;

    let mat = 0;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.material) {
        mat += Array.isArray(mesh.material) ? mesh.material.length : 1;
      }
    });

    setStats({ geo, mat, tex });
  });

  return stats;
}

export function MemoryDebugHUD() {
  const stats = useMemoryStats();

  return (
    <Html>
      <div
        style={{
          zIndex: 9999,
          position: 'absolute',
          top: '50%',
          left: '50%',
          background: 'rgba(0,0,0,0.6)',
          color: '#0f0',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '6px 10px',
          borderRadius: '6px',
          minWidth: '150px',
        }}
      >
        <div>🟦 Geometries: {stats.geo}</div>
        <div>🎨 Materials: {stats.mat}</div>
        <div>🖼️ Textures: {stats.tex}</div>
      </div>
    </Html>
  );
}
