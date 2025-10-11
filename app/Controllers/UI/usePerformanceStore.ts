// stores/usePerformanceStore.ts
import { create } from 'zustand';

interface PerformanceState {
  fps: number;
  frameTime: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  triangles: number;
  updateMetrics: (data: Partial<PerformanceState>) => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => {
  return {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    geometries: 0,
    textures: 0,
    triangles: 0,
    updateMetrics: (data) => {
      console.log('updating performance', data);
      set(data);
    },
  };
});
