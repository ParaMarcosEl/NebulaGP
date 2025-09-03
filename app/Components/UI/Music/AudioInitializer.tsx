'use client';

import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import './PlaylistInitializer.css';

const AudioInitializer = () => {
  const [isClient, setIsClient] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    tracks,
    currentTrack,
    isPlaying,
    setPlaying,
    nextTrack,
    setMasterVolume,
    setMusicVolume,
    setAudioEnabled,
    masterVolume,
    musicVolume,
    audioEnabled
  } = useAudioStore();

  // 🔹 Initialize and handle track changes
  useEffect(() => {
    if (!isClient || !hasPrompted) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false;
      audioRef.current.crossOrigin = 'anonymous';

      audioRef.current.onended = () => {
        nextTrack();
      };
    }

    const newTrackUrl = tracks[currentTrack];
    if (audioRef.current.src !== newTrackUrl) {
      audioRef.current.src = newTrackUrl;
    }

    if (audioEnabled) {
      audioRef.current.play().catch((error) => {
        console.error('Audio playback failed:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [currentTrack, isPlaying, tracks, hasPrompted, isClient, nextTrack, audioEnabled]);

  // 🔹 Reactively adjust volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = masterVolume * musicVolume;
    }
  }, [masterVolume, musicVolume]);

  const handleYes = () => {
    setAudioEnabled(true);
    setHasPrompted(true);
    setPlaying(true);
    setMasterVolume(1);
    setMusicVolume(1);
  };

  const handleNo = () => {
    setAudioEnabled(false);
    setHasPrompted(true);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  if (!isClient || hasPrompted) return null;

  return (
    <div className="playlist-prompt-container">
      <p className="prompt-text">Use audio?</p>
      <button onClick={handleYes} className="prompt-button prompt-button-yes">
        Yes
      </button>
      <button onClick={handleNo} className="prompt-button prompt-button-no">
        No
      </button>
    </div>
  );
};

export default AudioInitializer;
