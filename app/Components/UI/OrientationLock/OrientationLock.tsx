'use client';
import { useEffect, useState } from 'react';
import './OrientationLock.css';

export default function OrientationLock() {
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null); // null means "not determined yet"

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation(); // Set on mount
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Until we know the orientation, render nothing to avoid flicker
  if (isLandscape === null) return null;

  return !isLandscape ? (
    <div className='overlay'>
      <p>Please rotate your device to landscape mode.</p>
    </div>
  ) : null;
}
