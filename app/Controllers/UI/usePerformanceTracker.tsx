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
      let heapUsedMB, heapTotalMB, heapPercent;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((performance as any).memory) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { usedJSHeapSize, totalJSHeapSize } = (performance as any).memory;
        heapUsedMB = usedJSHeapSize / 1048576; // bytes → MB
        heapTotalMB = totalJSHeapSize / 1048576;
        heapPercent = (heapUsedMB / heapTotalMB) * 100;

        usePerformanceStore.getState().updateMetrics({
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          heapPercent,
        });
      }

      updateMetrics({
        fps,
        frameTime,
        drawCalls: info.render.calls,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        triangles: info.render.triangles,
        materials: uniqueMaterialCount,
        heapUsed: heapUsedMB || 0,
        heapTotal: heapTotalMB || 0,
        heapPercent: heapPercent || 0,

      });
        
      frames.current = 0;
      lastTime.current = now;
    }
  });
}

