'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CSSProperties, useEffect, useMemo, useState } from 'react';

import { blue } from '@/Constants/colors';

const GameCanvas = dynamic(() => import('@/Components/GameCanvas'), {
  ssr: false,
  loading: () => <div style={styles.backgroundFallback} aria-hidden />,
});

const styles = {
  main: {
    padding: '2rem',
    color: '#fff',
    fontFamily: 'monospace',
    maxWidth: '800px',
    margin: '0 auto',
  } as CSSProperties,
  heading: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    color: blue,
  } as CSSProperties,
  paragraph: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '2rem',
  } as CSSProperties,
  link: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: blue,
    color: '#000',
    textDecoration: 'none',
    fontWeight: 'bold',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
  } as CSSProperties,
  controlsSection: {
    marginTop: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  } as CSSProperties,
  subheading: {
    display: 'inline-block',
    background: 'rgba(0, 0, 0, .7)',
    fontSize: '20px',
    textAlign: 'center',
    color: blue,
    marginBottom: '1rem',
    borderRadius: '5px',
    minWidth: '200px',
    padding: '10px',
    alignSelf: 'center',
  } as CSSProperties,
  table: {
    width: '100%',
    maxWidth: '600px',
    margin: '1rem auto 2rem',
    borderCollapse: 'collapse',
    background: '#111a',
    border: '1px solid #0ff5',
    borderRadius: '8px',
    overflow: 'hidden',
    backdropFilter: 'blur(4px)',
  } as CSSProperties,
  th: {
    background: '#0ff3',
    color: blue,
    fontWeight: 'bold',
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #0ff5',
  } as CSSProperties,
  td: {
    padding: '12px 16px',
    textAlign: 'left',
    color: '#ddd',
  } as CSSProperties,
  evenRow: {
    backgroundColor: '#222a',
  } as CSSProperties,
  kbd: {
    background: '#222',
    border: '1px solid #555',
    padding: '3px 6px',
    borderRadius: '4px',
    marginRight: '4px',
    color: blue,
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  } as CSSProperties,
  audioOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    backgroundColor: 'rgba(4, 6, 22, 0.88)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  } as CSSProperties,
  audioCard: {
    maxWidth: '460px',
    width: '100%',
    border: '1px solid #0ff5',
    borderRadius: '12px',
    background: 'rgba(8, 12, 42, 0.95)',
    boxShadow: '0 0 30px rgba(1, 235, 255, 0.24)',
    padding: '1.25rem 1.5rem',
    textAlign: 'center',
  } as CSSProperties,
  audioTitle: {
    color: blue,
    marginBottom: '0.5rem',
    fontSize: '1.2rem',
  } as CSSProperties,
  audioText: {
    color: '#dbe7ff',
    marginBottom: '1rem',
    lineHeight: 1.45,
  } as CSSProperties,
  audioAction: {
    display: 'inline-block',
    padding: '0.7rem 1.3rem',
    borderRadius: '6px',
    border: 'none',
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: blue,
    cursor: 'pointer',
  } as CSSProperties,
  backgroundFallback: {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    background:
      'radial-gradient(circle at 20% 20%, rgba(44, 97, 255, 0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(13, 230, 255, 0.25), transparent 35%), #02030a',
  } as CSSProperties,
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
};

const keyboardControls = [
  [['W', 'S'], 'Pitch Up / Down'],
  [['A', 'D'], 'Roll Left / Right'],
  [['I'], 'Accelerate'],
  [['K'], 'Brake'],
];

const gamepadControls = [
  [['X'], 'Accelerate'],
  [['☐'], 'Brake'],
  [['Left Stick'], 'Pitch / Roll'],
];

function hasWebGLSupport() {
  if (typeof window === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

export default function Home() {
  const [isAudioPopupVisible, setIsAudioPopupVisible] = useState(true);
  const [isCanvasMounted, setIsCanvasMounted] = useState(false);
  const webGLSupported = useMemo(() => hasWebGLSupport(), []);

  useEffect(() => {
    if (!isAudioPopupVisible) {
      return;
    }

    const preloadScene = () => {
      import('@/Components/GameCanvas');
    };

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(preloadScene);
      return;
    }

    const timeout = window.setTimeout(preloadScene, 150);
    return () => window.clearTimeout(timeout);
  }, [isAudioPopupVisible]);

  const handleEnableAudio = () => {
    setIsCanvasMounted(true);
    setIsAudioPopupVisible(false);
  };

  return (
    <>
      {webGLSupported && isCanvasMounted ? <GameCanvas /> : <div style={styles.backgroundFallback} aria-hidden />}

      {isAudioPopupVisible && (
        <div style={styles.audioOverlay}>
          <div style={styles.audioCard}>
            <h2 style={styles.audioTitle}>Enable audio?</h2>
            <p style={styles.audioText}>
              The universe preloads while this popup is open, so gameplay can start instantly once audio is enabled.
            </p>
            <button type="button" onClick={handleEnableAudio} style={styles.audioAction}>
              Enable Audio
            </button>
          </div>
        </div>
      )}

      <main style={styles.main}>
        <h1 style={styles.heading}>NEBULA GP</h1>
        <p style={styles.paragraph}>Anti-gravity Racing</p>

        <Link href="/stage-select" style={styles.link}>
          Play Game
        </Link>

        <section style={styles.controlsSection}>
          <div style={styles.subheading}>🕹️ Controls</div>

          <div style={styles.subheading}>Keyboard</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Key</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {keyboardControls.map(([keys, action], i) => (
                <tr key={i} style={i % 2 ? styles.evenRow : undefined}>
                  <td style={styles.td}>
                    {(keys as string[]).map((key) => (
                      <kbd key={key} style={styles.kbd}>
                        {key}
                      </kbd>
                    ))}
                  </td>
                  <td style={styles.td}>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={styles.subheading}>Gamepad (PlayStation-style)</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Button</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {gamepadControls.map(([keys, action], i) => (
                <tr key={i} style={i % 2 ? styles.evenRow : undefined}>
                  <td style={styles.td}>
                    {(keys as string[]).map((key) => (
                      <kbd key={key} style={styles.kbd}>
                        {key}
                      </kbd>
                    ))}
                  </td>
                  <td style={styles.td}>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
