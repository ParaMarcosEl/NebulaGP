'use client';

import React from 'react';
import styles from './About.module.css';

export default function About() {
  return (
    <div className={styles.container} role="dialog" aria-labelledby="about-title">
      <header className={styles.header}>
        <div>
          <h1 id="about-title" className={styles.title}>
            Nebula Grand Prix
          </h1>
          <p className={styles.subtitle}>A 3D zero gravity flight racing simulator</p>
        </div>
        <div className={styles.version}>v0.1</div>
      </header>

      <section className={styles.authorSection}>
        <div className={styles.avatar} aria-hidden>
          <svg
            viewBox="0 0 96 96"
            width="56"
            height="56"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
          >
            <defs>
              <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#1f6feb" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <rect width="96" height="96" rx="18" fill="url(#g)" />
            <text
              x="50%"
              y="54%"
              textAnchor="middle"
              fontSize="36"
              fontWeight="700"
              fill="#fff"
              fontFamily="Inter, Arial, sans-serif"
            >
              PE
            </text>
          </svg>
        </div>

        <div className={styles.authorInfo}>
          <h3 className={styles.authorName}>Para El</h3>
          <p className={styles.authorRole}>Creator — Full-Stack & Game Developer</p>
        </div>
      </section>

      <p className={styles.bio}>
        Nebula Grand Prix is an experimental browser-native flight experience that explores
        procedural worlds, GPU-driven effects, and responsive, high-performance WebGL gameplay. It
        mixes creative systems design with practical engineering to push the limits of real-time
        graphics in the browser.
      </p>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Key features</h4>
        <ul className={styles.list}>
          <li>Free-flight physics with pitch & roll controls</li>
          <li>Procedural terrain & dynamic environments</li>
          <li>GPU particle systems & custom shaders</li>
          <li>Checkpoint-based racing with AI bots</li>
          <li>Minimal, performance-first UI</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Tech Stack</h4>
        <div className={styles.techList}>
          {[
            'TypeScript',
            'Next.js',
            'React',
            'React Three Fiber',
            'Three.js',
            'GLSL',
            'Zustand',
            'Firebase',
          ].map((t) => (
            <span key={t} className={styles.techTag}>
              {t}
            </span>
          ))}
        </div>
      </section>

      <div className={styles.links}>
        <a
          className={styles.linkBtn}
          href="https://github.com/paramarcosel"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          className={styles.linkBtn}
          href="https://www.linkedin.com/in/marcoswade"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a
          className={styles.linkBtn}
          href="mailto:parael82@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Email
        </a>
        <a
          className={styles.linkGhost}
          href="https://github.com/paramarcosel/nebulagp/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report an issue
        </a>
      </div>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Para El — built with ❤️ for the web
      </footer>
    </div>
  );
}
