'use client';

import { useEffect } from 'react';
import { unlockAudio } from '@/Utils/audio';

export function AudioUnlocker() {
  useEffect(() => {
    const handler = () => unlockAudio();

    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler);

    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  return null;
}
