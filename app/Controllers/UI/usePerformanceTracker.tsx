// @/Controllers/UI/usePerformanceTracker.tsx
import { useThree, useFrame } from '@react-three/fiber';
import { usePerformanceStore } from '@/Controllers/UI/usePerformanceStore';
import { useRef } from 'react';
import * as THREE from 'three';

export function usePerformanceTracker() {
  const { gl, scene } = useThree();
  const { updateMetrics } = usePerformanceStore((s) => s);
  const lastTime = useRef(performance.now());
  const frames = useRef(0);
  
  useFrame(() => {
    const now = performance.now();
    frames.current++;
    
    // Update every ~1s to reduce overhead
    if (now - lastTime.current >= 1000) {
      const fps = (frames.current * 1000) / (now - lastTime.current);
      const frameTime = 1000 / fps;
      
      const info = gl.info;
      
      
const materialUuids = new Map<string, { count: number; type?: string }>();

scene.traverse((obj) => {
  const mesh = obj as THREE.Mesh;
  if (!mesh.material) return;

  if (Array.isArray(mesh.material)) {
    for (const m of mesh.material) {
      if (!m) continue;
      const info = materialUuids.get(m.uuid) ?? { count: 0, type: m.type };
      info.count++;
      materialUuids.set(m.uuid, info);
    }
  } else {
    const m = mesh.material;
    const info = materialUuids.get(m.uuid) ?? { count: 0, type: m.type };
    info.count++;
    materialUuids.set(m.uuid, info);
  }
});

const uniqueMaterialCount = materialUuids.size;

// Optional: debug snapshot when unique count spikes (print top 10)
if (uniqueMaterialCount > 200) {
  const top = Array.from(materialUuids.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  console.debug('Material spike: unique=', uniqueMaterialCount, 'top:', top);
}

updateMetrics({
  fps,
  frameTime,
  drawCalls: info.render.calls,
  geometries: info.memory.geometries,
  textures: info.memory.textures,
  triangles: info.render.triangles,
  materials: uniqueMaterialCount,
});

      frames.current = 0;
      lastTime.current = now;
    }
  });
}
