// usePlaySound.ts
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useAudioStore } from './useAudioStore';
import { useRef } from 'react';

type LastPlayedMap = WeakMap<AudioBuffer, number>;

export function usePlaySound() {
  const { scene } = useThree();
  const { listener, audioEnabled, masterVolume, sfxVolume } = useAudioStore();
  const lastPlayedRef = useRef<LastPlayedMap>(new WeakMap());

  return (buffer: AudioBuffer, position: THREE.Vector3, volume?: number, rate?: number) => {
    if (!listener || !audioEnabled) return;

    const now = performance.now();
    const lastPlayed = lastPlayedRef.current.get(buffer) || 0;

    if (rate && now - lastPlayed < rate * 1000) {
      // Too soon, skip playback
      return;
    }

    lastPlayedRef.current.set(buffer, now);

    const sound = new THREE.PositionalAudio(listener);
    sound.setBuffer(buffer);
    sound.setRefDistance(10);
    sound.position.copy(position);
    sound.setVolume((volume ?? 1) * masterVolume * sfxVolume);
    sound.play();
    scene.add(sound);

    sound.onEnded = () => {
      scene.remove(sound);
      sound.disconnect();
    };
  };
}
