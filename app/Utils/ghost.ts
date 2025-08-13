'use client';

export function saveBestLap(trackId: number, time: number, data: Float32Array) {
  const allGhosts = JSON.parse(localStorage.getItem('ghosts') ?? '{}');
  const prev = allGhosts[`${trackId}`];

  if (!prev || (prev.time && time < prev.time)) {
    allGhosts[trackId] = {
      time,
      frames: Array.from(data),
    };
    localStorage.setItem('ghosts', JSON.stringify(allGhosts));
  }
}

export function loadGhost(trackId: number): { time: number; frames: Float32Array } | null {
  if (typeof window === 'undefined') return null; // SSR guard
  const raw = localStorage.getItem('ghosts');
  if (!raw) return null;

  try {
    const allGhosts = JSON.parse(raw);
    const ghost = allGhosts[`${trackId}`];
    if (!ghost) return null;

    return {
      time: ghost.time,
      frames: new Float32Array(ghost.frames),
    };
  } catch {
    return null;
  }
}
