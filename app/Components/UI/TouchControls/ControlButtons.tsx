import React, { useEffect, useState } from 'react';
import { setThrottle, setFiringRef } from '@/Components/Player/PlayerController'; // keep your function
import { isMobileDevice } from '@/Utils';
import './ThrottleBtn.css';

export function ControlButtons() {
  const [showControls, setShowControls] = useState(false);
  const [activeThrottle, setActiveThrottle] = useState(0); // -1 = brake, 0 = idle, 1 = accel
  const [firing, setFiring] = useState(false);

  useEffect(() => {
    if (isMobileDevice()) {
      setShowControls(true);
    }
  }, []);

  useEffect(() => {
    setThrottle(activeThrottle);
  }, [activeThrottle]);

  useEffect(() => {
    setFiringRef(firing);
  }, [firing]);

  if (!showControls) return null;

  const handlePress = (dir: number) => {
    setActiveThrottle(dir);
  };

  const fire = (isFiring: boolean) => {
    setFiring(isFiring);
  };

  const ceaseFire = () => {
    setFiring(false);
  };

  const handleRelease = () => {
    setActiveThrottle(0);
  };

  return (
    <div className="throttle-container">
      <button
        className={`fire-btn ${firing === true ? 'active' : ''}`}
        onTouchStart={() => fire(true)}
        onTouchEnd={ceaseFire}
        onMouseDown={() => fire(true)}
        onMouseUp={ceaseFire}
      >
        Fire
      </button>
      <button
        className={`throttle-btn ${activeThrottle === 1 ? 'active' : ''}`}
        onTouchStart={() => handlePress(1)}
        onTouchEnd={handleRelease}
        onMouseDown={() => handlePress(1)}
        onMouseUp={handleRelease}
      >
        Accel
      </button>
      <button
        className={`brake-btn ${activeThrottle === -1 ? 'active' : ''}`}
        onTouchStart={() => handlePress(-1)}
        onTouchEnd={handleRelease}
        onMouseDown={() => handlePress(-1)}
        onMouseUp={handleRelease}
      >
        Brake
      </button>
    </div>
  );
}
