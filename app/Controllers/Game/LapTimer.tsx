// controllers/LapTimer.ts
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController'; // Assuming GameController is your zustand store file

export function useLapTimer() {
  const setLapTime = useGameStore((state) => state.setLapTime);
  const lapStartTime = useGameStore((state) => state.lapStartTime); // Get start time from store

  useFrame(() => {
    const now = performance.now();
    setLapTime(now - lapStartTime); // Update lapTime in the store
  });
}
