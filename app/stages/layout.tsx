'use client';

// app/game/layout.tsx
import AnalogInput from '@/Components/UI/TouchControls/AnalogInput';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="game-layout">
      {children}
      <AnalogInput />
    </div>
  );
}
