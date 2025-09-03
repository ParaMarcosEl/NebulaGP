'use client';

import { useEffect } from 'react';
import { useAudioStore } from './useAudioStore';

export const usePlaylist = () => {
  const setPlaylist = useAudioStore((s) => s.setPlaylist);
  const play = useAudioStore((s) => s.play);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  useEffect(() => {
    // Just set up the playlist, don't play automatically
    setPlaylist([
      { name: 'Track 1', url: '/sound/music/nebula01.mp3' },
      { name: 'Track 2', url: '/sound/music/nebula02.mp3' },
      { name: 'Track 3', url: '/sound/music/nebula03.mp3' },
    ]);
  }, [setPlaylist]);

  if (isPlaying) return null;

  return (
    <button
      className="fixed bottom-4 right-4 p-3 bg-black text-white rounded"
      onClick={() => play(0)}
    >
      ▶️ Play Music
    </button>
  );
};
