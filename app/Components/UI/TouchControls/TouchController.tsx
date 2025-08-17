'use client';

import { useEffect, useState, useRef } from 'react';
import { Joystick } from 'react-joystick-component';
import { isMobileDevice } from '@/Utils';
import { playerInputAxis } from '@/Components/Player/PlayerController';
import './TouchControlls.css';

export default function TouchControls() {
  const [showControls, setShowControls] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: -9999, y: -9999 }); // offscreen initially
  const touchActive = useRef(false);

  useEffect(() => {
    if (isMobileDevice()) setShowControls(true);
  }, []);

  if (!showControls) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchActive.current) return;
    const touch = e.touches[0];
    touchActive.current = true;
    setPos({ x: touch.clientX, y: touch.clientY });
    setVisible(true);
  };

  const handleStop = () => {
    touchActive.current = false;
    playerInputAxis.set({ x: 0, y: 0 });
    setVisible(false); // hide joystick after release
    setPos({ x: -9999, y: -9999 }); // move offscreen
  };

  return (
    <div className="controls" onTouchStart={handleTouchStart} onTouchEnd={handleStop}>
      <div
        className="floating-joystick"
        style={{
          position: 'absolute',
          left: pos.x - 115,
          top: pos.y - 115,
          visibility: visible ? 'visible' : 'hidden',
        }}
      >
        <Joystick
          size={230}
          stickSize={70}
          baseColor="rgba(255,255,255,0.1)"
          stickColor="white"
          throttle={100}
          move={(e) => {
            playerInputAxis.set({ x: e.x || 0, y: e.y || 0 });
          }}
          stop={handleStop}
        />
      </div>
    </div>
  );
}
