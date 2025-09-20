'use client';

import { useEffect, useState } from 'react';
import './CookieConsent.css';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setVisible(false);
    // 👉 load optional cookies/analytics here
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <span>This site uses cookies to improve your experience.</span>
      <button onClick={acceptCookies} className="cookie-btn">
        Accept
      </button>
    </div>
  );
}
