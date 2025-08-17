// components/GameTouchControls.tsx
import { useGameStore } from '@/Controllers/Game/GameController';
import RadialTouchInput from '@/Components/UI/TouchControls/RadialTouchInput';

export default function AnalogInput() {
  const touchEnabled = useGameStore((s) => s.touchEnabled);

  if (!touchEnabled) return null;

  return <RadialTouchInput radius={120} />;
}
