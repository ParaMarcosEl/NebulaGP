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
    textAlign: 'center',
  } as CSSProperties,
  heading: {
    fontSize: '2.5rem',
    marginBottom: '2rem',
    color: blue,
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
    margin: '0.5rem',
    minWidth: '100px',
  } as CSSProperties,
};

export default function StageSelect() {
  return (
    <>
      <GalaxyBackground />
      <main style={styles.main}>
        <h1 style={styles.heading}> Select Stage</h1>

        <div>
          <Link href="/stages/stage1" style={styles.link}>
            Stage 1
          </Link>
          <Link href="/stages/stage2" style={styles.link}>
            Stage 2
          </Link>
          <Link href="/stages/stage3" style={styles.link}>
            Stage 3
          </Link>
          {/* Add more stages here if needed */}
        </div>

        <div>
          <Link href="/" style={styles.link}>
            Home
          </Link>
        </div>
      </main>
    </>
  );
}
