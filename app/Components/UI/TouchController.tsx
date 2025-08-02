'use client';

// import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Joystick } from 'react-joystick-component';
import { isMobileDevice } from '@/Utils';
// import styles from './TouchControls.module.css'; // optional styling
import { playerInputAxis } from '@/Controllers/playerControls/PlayerController';

export default function TouchControls() {
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (isMobileDevice()) {
      setShowControls(true);
    }
  }, []);

  if (!showControls) return null;

  return (
    <div
      className="touch-controls"
      style={{
        position: 'absolute',
        bottom: 60,
        left: 30,
        zIndex: 1000,
      }}
    >
      <Joystick
        size={80}
        baseColor="rgba(255,255,255,0.2)"
        stickColor="white"
        throttle={100}
        move={(e) => {
          playerInputAxis.set({ x: e.x || 0, y: e.y || 0 });
        }}
        stop={() => {
          playerInputAxis.set({ x: 0, y: 0 });
        }}
      />
    </div>
  );
}
