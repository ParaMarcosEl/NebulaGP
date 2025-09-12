'use client';

import React from 'react';
import cx from 'classnames';
import { useAudioStore } from '@/Controllers/Audio/useAudioStore'; // adjust path

import './PrevNextButtons.css';

const PrevNextButtons = ({ className = '' }: { className?: string }) => {
  const { prevTrack, nextTrack } = useAudioStore((s) => s);

  const playNext = () => {
    nextTrack();
  };

  const playPrevious = () => {
    prevTrack();
  };

  return (
    <div className={cx(className)}>
      <button
        className={cx('audio-toggle-button')}
        onClick={playPrevious}
        aria-label={'Play Previous'}
      >
        {'<'}
      </button>
      <button className={cx('audio-toggle-button')} onClick={playNext} aria-label={'Play Next'}>
        {'>'}
      </button>
    </div>
  );
};

export default PrevNextButtons;
