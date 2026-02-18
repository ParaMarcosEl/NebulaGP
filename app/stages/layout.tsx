'use client';

// app/game/layout.tsx
import AnalogInput from '@/Components/UI/TouchControls/AnalogInput';
import { useFullscreen } from '@/Controllers/UI/useFullscreen';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  useFullscreen();
  return (
    <div className="game-layout">
      {children}
      <AnalogInput />
    </div>
  );
}
