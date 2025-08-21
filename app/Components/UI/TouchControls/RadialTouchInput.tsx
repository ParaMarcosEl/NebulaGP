'use client';

import { useEffect, useState, useRef } from 'react';
import { isMobileDevice } from '@/Utils';
import { playerInputAxis } from '@/Components/Player/PlayerController';
import './RadialTouchInput.css';

interface Props {
  radius?: number; // max radius for input clamp
}

export default function RadialTouchInput({ radius = 120 }: Props) {
  const [show, setShow] = useState(false);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null);

  const active = useRef(false);

  useEffect(() => {
    if (isMobileDevice()) setShow(true);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const screenMid = window.innerWidth / 2;

    // Only allow touches starting on the left half
    if (touch.clientX > screenMid) return;

    const pos = { x: touch.clientX, y: touch.clientY };
    setCenter(pos);
    setStick(pos);
    active.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!active.current || !center) return;

    const touch = e.touches[0];
    const screenMid = window.innerWidth * 0.7;

    // If the finger moves past the middle, you can either stop tracking or clamp it
    if (touch.clientX > screenMid) return;

    const dx = touch.clientX - center.x;
    const dy = touch.clientY - center.y;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, radius);

    const angle = Math.atan2(dy, dx);

    const stickX = center.x + Math.cos(angle) * clampedDist;
    const stickY = center.y + Math.sin(angle) * clampedDist;

    setStick({ x: stickX, y: stickY });

    // normalize to -1–1 scale
    const normX = (clampedDist / radius) * Math.cos(angle);
    const normY = (clampedDist / radius) * Math.sin(angle);

    playerInputAxis.set({ x: normX, y: normY });
  };

  const handleTouchEnd = () => {
    active.current = false;
    setCenter(null);
    setStick(null);
    playerInputAxis.set({ x: 0, y: 0 });
  };

  if (!show) return null;

  return (
    <div
      className="radial-touch-input"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
