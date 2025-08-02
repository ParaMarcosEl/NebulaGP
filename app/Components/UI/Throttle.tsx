import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { setThrottle } from '@/Controllers/playerControls/PlayerController'; // Adjust path if needed
import { isMobileDevice } from '@/Utils';

export function ThrottleLever() {
  const leverRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0); // range from -1 to 1
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (isMobileDevice()) {
      setShowControls(true);
    }
  }, []);

  useEffect(() => {
    setThrottle(value);
  }, [value]);

  if (!showControls) return null;
  const handleDrag = (e: React.TouchEvent | React.MouseEvent) => {
    const container = leverRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const centerY = rect.top + rect.height / 2;
    const delta = centerY - clientY;
    const normalized = Math.max(-1, Math.min(1, delta / (rect.height / 2)));
    setValue(normalized);
  };

  const handleEnd = () => {
    setValue(0);
  };

  const containerStyle: CSSProperties = {
    position: 'absolute',
    right: '20px',
    bottom: '100px',
    width: '50px',
    height: '150px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '25px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    userSelect: 'none',
  };

  const trackStyle: CSSProperties = {
    position: 'absolute',
    width: '6px',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.2)',
    left: '50%',
    transform: 'translateX(-50%)',
  };

  const leverStyle: CSSProperties = {
    width: '40px',
    height: '20px',
    background: '#ffcc00',
    borderRadius: '10px',
    position: 'relative',
    transform: `translateY(${-value * 40}px)`,
    transition: 'transform 0.05s ease-out',
  };

  return (
    <div
      ref={leverRef}
      style={containerStyle}
      onTouchMove={handleDrag}
      onTouchEnd={handleEnd}
      onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
      onMouseUp={handleEnd}
    >
      <div style={trackStyle} />
      <div style={leverStyle} />
    </div>
  );
}
