import { create } from 'zustand';

type Scene = 'title' | 'select' | 'stage';

interface GameState {
  scene: Scene;
  setScene: (scene: Scene) => void;
  selectedStage: number;
  setSelectedStage: (stage: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  scene: 'title',
  setScene: (scene) => set({ scene }),
  selectedStage: 1,
  setSelectedStage: (stage) => set({ selectedStage: stage }),
}));
