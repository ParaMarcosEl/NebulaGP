import React, { useEffect, useRef, useState } from 'react';

export const Counter: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  const sharedBufferRef = useRef<SharedArrayBuffer | null>(null);
  const counterRef = useRef<Int32Array | null>(null);

  useEffect(() => {
    // Create SharedArrayBuffer for one 32-bit integer
    const sharedBuffer = new SharedArrayBuffer(4);
    sharedBufferRef.current = sharedBuffer;
    counterRef.current = new Int32Array(sharedBuffer);

    // Start Worker
    const worker = new Worker(new URL('./Counter.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.postMessage({ sharedBuffer });

    // Poll for updates
    const interval = setInterval(() => {
      if (counterRef.current) {
        const value = Atomics.load(counterRef.current, 0);
        setSeconds(value);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      worker.terminate();
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: '1em',
        right: '4em',
        fontSize: '1.5rem',
        fontFamily: 'sans-serif',
      }}
    >
      Seconds counted: {seconds}
    </div>
  );
};
