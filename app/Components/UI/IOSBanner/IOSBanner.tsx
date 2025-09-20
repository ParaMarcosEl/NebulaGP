'use client';

import { useEffect, useState } from 'react';
import './IOSBanner.css';

const IOSBanner = () => {
  const [show, setShow] = useState(false);
  const [instruction, setInstruction] = useState('Tap the Share button');
  const [isIpadDevice, setIsIpadDevice] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;

    // Detect iPhone / iPod
    const isIphone = /iphone|ipod/i.test(ua);

    // Detect "classic" iPad UA
    const isIpad = /ipad/i.test(ua);

    // Detect iPadOS in desktop mode (Macintosh + touch support)
    const isIpadOSDesktop =
      ua.includes('Macintosh') && navigator.maxTouchPoints > 1;

    const isIOS = isIphone || isIpad || isIpadOSDesktop;

    // Detect Safari (exclude Chrome & Firefox on iOS)
    const isSafari = /^((?!chrome|crios|fxios).)*safari/i.test(ua);

    // Already installed (PWA standalone mode)
    const isInStandaloneMode =
      'standalone' in window.navigator &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone;

    // User has dismissed manually before
    const dismissed = localStorage.getItem('iosBannerDismissed') === 'true';

    if (isIOS && isSafari && !isInStandaloneMode && !dismissed) {
      setShow(true);

      if (isIphone) {
        setInstruction('Tap the Share button at the bottom');
        setIsIpadDevice(false);
      } else if (isIpad || isIpadOSDesktop) {
        setInstruction('Tap the Share button at the top right');
        setIsIpadDevice(true);
      }
    }

    // If installed later, ensure it never comes back
    if (isInStandaloneMode) {
      localStorage.setItem('iosBannerDismissed', 'true');
      setShow(false);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('iosBannerDismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="ios-banner">
      <p>
        Install <strong>Nebula GP</strong>: {instruction}
        <span className={`ios-icon ${isIpadDevice ? 'ipad' : ''}`}>
          {/* Share Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 3l4 4h-3v7h-2V7H8l4-4zM5 20h14v-2H5v2z" />
          </svg>
        </span>
        then
        <span className={`ios-icon ${isIpadDevice ? 'ipad' : ''}`}>
          {/* Add to Home Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 5v14m-7-7h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        Add to Home Screen
      </p>
      <button className="ios-banner-close" onClick={dismiss}>
        ×
      </button>
    </div>
  );
};

export default IOSBanner;
