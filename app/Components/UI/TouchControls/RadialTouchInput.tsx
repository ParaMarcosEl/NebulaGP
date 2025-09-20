'use client';

import { useEffect, useState, useRef } from 'react';
import { isMobileDevice } from '@/Utils';
import { playerInputAxis } from '@/Components/Player/PlayerController';
import './RadialTouchInput.css';

interface Props {
  radius?: number;
}

export default function RadialTouchInput({ radius = 120 }: Props) {
  const [show, setShow] = useState(false);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null);

  const active = useRef(false);
  const touchId = useRef<number | null>(null);

  useEffect(() => {
    if (isMobileDevice()) setShow(true);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    // if already tracking a finger, ignore new ones
    if (active.current) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const screenMid = window.innerWidth / 2;

      // Only allow touches starting on the left half
      if (touch.clientX > screenMid) continue;

      const pos = { x: touch.clientX, y: touch.clientY };
      setCenter(pos);
      setStick(pos);

      active.current = true;
      touchId.current = touch.identifier; // save which finger we track
      break;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!active.current || !center || touchId.current === null) return;

    // find our tracked touch
    const touch = Array.from(e.touches).find(
      (t) => t.identifier === touchId.current
    );
    if (!touch) return;

    const screenMid = window.innerWidth * 0.7;

    if (touch.clientX > screenMid) return;

    const dx = touch.clientX - center.x;
    const dy = touch.clientY - center.y;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);

    const stickX = center.x + Math.cos(angle) * clampedDist;
    const stickY = center.y + Math.sin(angle) * clampedDist;

    setStick({ x: stickX, y: stickY });

    const normX = (clampedDist / radius) * Math.cos(angle);
    const normY = (clampedDist / radius) * Math.sin(angle);

    playerInputAxis.set({ x: normX, y: normY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchId.current === null) return;

    // did our tracked finger end?
    const ended = Array.from(e.changedTouches).some(
      (t) => t.identifier === touchId.current
    );

    if (ended) {
      active.current = false;
      touchId.current = null;
      setCenter(null);
      setStick(null);
      playerInputAxis.set({ x: 0, y: 0 });
    }
  };

  if (!show) return null;

  return (
    <div
      className="radial-touch-input"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {center && (
        <>
          <div
            className="base-circle"
            style={{
              left: center.x - radius,
              top: center.y - radius,
              width: radius * 2,
              height: radius * 2,
            }}
          />
          {stick && (
            <div
              className="stick-circle"
              style={{
                left: stick.x - 30,
                top: stick.y - 30,
                width: 60,
                height: 60,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
