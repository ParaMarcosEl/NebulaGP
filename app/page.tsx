'use client';

import Link from 'next/link';
import { CSSProperties } from 'react';
import { GalaxyBackground } from '@/Components/UI/backgrounds/Galaxy';
import { blue } from '@/Constants/colors';

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

export default function Home() {
  return (
    <>
      <GalaxyBackground />
      <main style={styles.main}>
        <h1 style={styles.heading}>NEBULA GP</h1>
        <p style={styles.paragraph}>Anti-gravity Racing</p>

        <Link href="/stage-select" style={styles.link}>
          Start Game
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
