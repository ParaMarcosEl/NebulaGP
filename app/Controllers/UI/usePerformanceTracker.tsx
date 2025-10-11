// @/Controllers/UI/usePerformanceTracker.tsx
import { useThree, useFrame } from '@react-three/fiber';
import { usePerformanceStore } from '@/Controllers/UI/usePerformanceStore';
import { useRef } from 'react';

export function usePerformanceTracker() {
  const { gl } = useThree();
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
      updateMetrics({
        fps,
        frameTime,
        drawCalls: info.render.calls,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        triangles: info.render.triangles,
      });

      frames.current = 0;
      lastTime.current = now;
    }
  });
}
