'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import './GlobalMusicPlayer.css';

const GlobalMusicPlayer: React.FC = () => {
  const {
    tracks,
    currentTrack,
    isPlaying,
    setPlaying,
    nextTrack,
    musicVolume,
    masterVolume
  } = useAudioStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showPrompt, setShowPrompt] = useState(true);

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch((err) => console.warn(err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume * masterVolume;
    }
  }, [musicVolume]);

  const handlePlay = () => {
    setShowPrompt(false);
    setPlaying(true);
  };

  const handleNo = () => {
    setShowPrompt(false);
    setPlaying(false);
  };

  return (
    <>
      {showPrompt && (
        <div className="music-popup">
          <div className="popup-content">
            <p>Play Music?</p>
            <div className="popup-buttons">
              <button onClick={handlePlay}>Yes</button>
              <button onClick={handleNo}>No</button>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={tracks[currentTrack]}
        loop
        onEnded={nextTrack}
      />
    </>
  );
};

export default GlobalMusicPlayer;
