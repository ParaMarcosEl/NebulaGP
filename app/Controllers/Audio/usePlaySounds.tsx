// usePlaySound.ts
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useAudioStore } from './useAudioStore';

export function usePlaySound() {
  const { scene } = useThree();
  const { listener, audioEnabled, masterVolume, sfxVolume } = useAudioStore();

  return (buffer: AudioBuffer, position: THREE.Vector3, volume?: number) => {
    if (!listener || !audioEnabled) return;
    const sound = new THREE.PositionalAudio(listener);
    sound.setBuffer(buffer);
    sound.setRefDistance(10);
    sound.position.copy(position);
    sound.setVolume((volume || 50) * masterVolume * sfxVolume);
    sound.play();
    scene.add(sound);

    sound.onEnded = () => {
      scene.remove(sound);
      sound.disconnect();
    };
  };
}
