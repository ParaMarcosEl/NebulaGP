// Controllers/UI/usePerformanceStore.ts
import { create } from 'zustand';

interface PerformanceState {
  fps: number;
  frameTime: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  triangles: number;
  materials: number;
  heapUsed: number;
  heapTotal: number;
  heapPercent: number;
  updateMetrics: (data: Partial<PerformanceState>) => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  geometries: 0,
  textures: 0,
  triangles: 0,
  materials: 0,
  heapUsed: 0,
  heapTotal: 0,
  heapPercent: 0,
  updateMetrics: (data) => set((state) => ({ ...state, ...data })),
}));
