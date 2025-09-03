'use client'

import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';

export default function GlobalMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { tracks, currentTrack, isPlaying, setPlaying, nextTrack } = useAudioStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Load the current track whenever the index changes
    audio.src = tracks[currentTrack];
    audio.load();

    if (isPlaying) {
      // If the state says we should be playing, attempt to play
      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
      });
    }

  }, [currentTrack, isPlaying, tracks]);

  // Handle play/pause with a single user gesture
  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      // User gesture: play the audio
      audio.play().catch(err => {
        console.error('Could not play audio on user gesture:', err);
        // Fallback for strict browsers: prompt user for interaction
        // You might show a "Play" button here.
      });
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  // Attach the event listener to a button or the document body
  // for the initial unlock
  useEffect(() => {
    document.addEventListener('click', handlePlayPause);
    document.addEventListener('keydown', handlePlayPause);

    return () => {
      document.removeEventListener('click', handlePlayPause);
      document.removeEventListener('keydown', handlePlayPause);
    };
  }, []);

  return (
    <>
      {/* This button should be visible to the user to trigger the initial playback */}
      <button onClick={handlePlayPause}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={nextTrack}
      />
    </>
  );
}