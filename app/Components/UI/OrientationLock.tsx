'use client';
import { useEffect, useState, CSSProperties } from 'react';

const overlayStyles: CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'black',
  color: 'white',
  textAlign: 'center',
  padding: '1rem',
};

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
    <div style={overlayStyles}>
      <p>Please rotate your device to landscape mode.</p>
    </div>
  ) : null;
}
