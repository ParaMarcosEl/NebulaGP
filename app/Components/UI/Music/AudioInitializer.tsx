'use client';

import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import { useIntroGateStore } from '@/Controllers/UI/useIntroGateStore';
import './PlaylistInitializer.css';

const AudioInitializer = () => {
  const [isClient, setIsClient] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { setAudioPromptVisible, resolveAudioPrompt } = useIntroGateStore((s) => s);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || hasPrompted) {
      setAudioPromptVisible(false);
      return;
    }

    setAudioPromptVisible(true);

    return () => {
      setAudioPromptVisible(false);
    };
  }, [hasPrompted, isClient, setAudioPromptVisible]);

  const {
    tracks,
    currentTrack,
    isPlaying,
    setPlaying,
    nextTrack,
    setMasterVolume,
    setMusicVolume,
    setAudioEnabled,
    sfxVolume,
    setSfxVolume,
    masterVolume,
    musicVolume,
    audioEnabled,
  } = useAudioStore();

  // 🔹 Initialize and handle track changes
  useEffect(() => {
    if (!isClient || !hasPrompted) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false;
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.volume = musicVolume;

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
    resolveAudioPrompt();
    setPlaying(true);
    setMasterVolume(masterVolume);
    setMusicVolume(musicVolume);
    setSfxVolume(sfxVolume);
  };

  const handleNo = () => {
    setAudioEnabled(false);
    setHasPrompted(true);
    resolveAudioPrompt();
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
