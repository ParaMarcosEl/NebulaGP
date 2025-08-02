'use client';

import { useEffect, useRef } from 'react';

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const stars: { x: number; y: number; z: number }[] = [];
    const numStars = 200;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
      });
    }

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        star.z -= 2;
        if (star.z <= 0) {
          star.z = w;
          star.x = Math.random() * w;
          star.y = Math.random() * h;
        }

        const k = 128.0 / star.z;
        const px = star.x * k + w / 2;
        const py = star.y * k + h / 2;

        if (px >= 0 && px < w && py >= 0 && py < h) {
          const size = (1 - star.z / w) * 2;
          ctx.fillStyle = 'white';
          ctx.fillRect(px, py, size, size);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
        width: '100vw',
        height: '100vh',
        background: 'black',
      }}
    />
  );
}
