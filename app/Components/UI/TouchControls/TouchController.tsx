'use client';

// import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Joystick } from 'react-joystick-component';
import { isMobileDevice } from '@/Utils';
// import styles from './TouchControls.module.css'; // optional styling
import { playerInputAxis } from '@/Components/Player/PlayerController';
import './TouchControlls.css';
export default function TouchControls() {
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (isMobileDevice()) {
      setShowControls(true);
    }
  }, []);

  if (!showControls) return null;

  return (
    <div className="controls">
      <Joystick
        size={230}
        stickSize={70}
        baseColor="rgba(255,255,255,0.1)"
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
