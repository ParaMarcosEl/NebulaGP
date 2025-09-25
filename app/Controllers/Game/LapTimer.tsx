// controllers/LapTimer.ts
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/Controllers/Game/GameController';
export function useLapTimer() {
  const {setLapTime, raceStatus} = useGameStore(s => s);
  useFrame(() => {
    if (raceStatus !== "racing") return;
    
    setLapTime()
  });
}
