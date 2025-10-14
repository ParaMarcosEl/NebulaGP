// components/PerformanceOverlay.tsx
'use client';
import { usePerformanceStore } from '@/Controllers/UI/usePerformanceStore';

export function PerformanceOverlay() {
  const { fps, frameTime, drawCalls, geometries, textures, triangles, materials } = usePerformanceStore();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '8rem',
        right: '1rem',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'limegreen',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        lineHeight: 1.4,
        zIndex: 1000,
      }}
    >
      <button
        style={{ all: 'unset' }}
        onClick={() => {
          console.log({ fps, frameTime, drawCalls, geometries, textures, triangles, materials })
        }}
      >
        <div>FPS: {fps.toFixed(1)}</div>
        <div>Frame Time: {frameTime.toFixed(2)} ms</div>
        <div>Draw Calls: {drawCalls}</div>
        <div>Geometries: {geometries}</div>
        <div>Textures: {textures}</div>
        <div>Materials: {materials}</div>
        <div>Triangles: {triangles}</div>
      </button>
    </div>
  );
}
