'use client';

import React from 'react';
import Image from 'next/image';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore'; // adjust path

import './AudioToggleButton.css';

const AudioToggleButton: React.FC = () => {
  const audioEnabled = useAudioStore((s) => s.audioEnabled);
  const setAudioEnabled = useAudioStore((s) => s.setAudioEnabled);

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  return (
    <button
      className="audio-toggle-button"
      onClick={toggleAudio}
      aria-label={audioEnabled ? 'Mute Audio' : 'Unmute Audio'}
    >
      <Image
        src={audioEnabled ? '/icons/sound_on.png' : '/icons/sound_off.png'}
        alt={audioEnabled ? 'Sound On' : 'Sound Off'}
        width={48}
        height={48}
        className="audio-toggle-icon"
        priority
      />
    </button>
  );
};

export default AudioToggleButton;
