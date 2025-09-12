// controllers/LapTimer.ts
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController';
export function useLapTimer() {
  useFrame(() => useGameStore.getState().setLapTime());
}
