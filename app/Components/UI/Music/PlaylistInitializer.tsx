'use client';

import { useState, useEffect, useRef } from 'react';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import './PlaylistInitializer.css';

const AudioInitializer = () => {
  // Add a new state to track if the component has been mounted.
  const [isClient, setIsClient] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Set isClient to true after the component has mounted.
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
    setAudioEnabled
  } = useAudioStore();

  useEffect(() => {
    // Only proceed with audio logic on the client
    if (!isClient || !hasPrompted) return;
    
    // ... rest of your audio logic
    // (This part is already fine as it's wrapped in a useEffect)
    
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false;
      audioRef.current.volume = 1;
      audioRef.current.crossOrigin = "anonymous";
      
      audioRef.current.onended = () => {
        nextTrack();
      };
    }
    
    const newTrackUrl = tracks[currentTrack];
    if (audioRef.current.src !== newTrackUrl) {
      audioRef.current.src = newTrackUrl;
    }
    
    if (isPlaying) {
      audioRef.current.play().catch(error => {
        console.error("Audio playback failed:", error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [currentTrack, isPlaying, tracks, hasPrompted, isClient, nextTrack]); // Add isClient to dependency array

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

  // Only show the prompt if the component is mounted on the client AND the user hasn't made a choice.
  if (!isClient || hasPrompted) {
    return null;
  }
  
  // This UI will now only render on the client side, after hydration.
  return (
    <div className="playlist-prompt-container">
      <p className="prompt-text">Use audio?</p>
      <button 
        onClick={handleYes} 
        className="prompt-button prompt-button-yes"
      >
        Yes
      </button>
      <button 
        onClick={handleNo} 
        className="prompt-button prompt-button-no"
      >
        No
      </button>
    </div>
  );
};

export default AudioInitializer;