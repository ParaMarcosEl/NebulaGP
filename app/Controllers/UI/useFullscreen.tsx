/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const requestFullscreen = () => {
      const elem = document.documentElement;

      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        // Safari
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        // IE11
        (elem as any).msRequestFullscreen();
      }
    };

    const handleInteraction = () => {
      if (!isFullscreen) {
        requestFullscreen();
      }
    };

    const handleChange = () => {
      const fullscreenNow = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );

      setIsFullscreen(fullscreenNow);

      // If user exits fullscreen, reattach listener for next gesture
      if (!fullscreenNow) {
        window.addEventListener('click', handleInteraction, { once: true });
        window.addEventListener('keydown', handleInteraction, { once: true });
        window.addEventListener('touchstart', handleInteraction, { once: true });
      }
    };

    // Initial listeners
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    // Track fullscreen changes
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    document.addEventListener('msfullscreenchange', handleChange);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);

      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
      document.removeEventListener('msfullscreenchange', handleChange);
    };
  }, [isFullscreen]);

  return isFullscreen;
}
