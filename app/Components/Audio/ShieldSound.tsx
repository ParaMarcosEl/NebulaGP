import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import { PositionalAudio } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ShieldSound({ volume = 20 }: { volume?: number }) {
  const ref = useRef<THREE.PositionalAudio>(null);
  const { audioEnabled, masterVolume, sfxVolume } = useAudioStore();

  // 🔹 Reactively adjust volume when settings change
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;

    const targetVolume = volume * masterVolume * sfxVolume;
    audio.setVolume(targetVolume);
  }, [masterVolume, sfxVolume, volume]);

  // 🔹 Control play/stop based on audioEnabled
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;

    if (!audioEnabled && audio.isPlaying) {
      audio.stop();
    } else if (audioEnabled && !audio.isPlaying) {
      audio.play();
    }
  }, [audioEnabled]);

  return (
    <PositionalAudio
      ref={ref}
      url="/sound/sfx/shield.mp3" // ✅ use Drei's loader
      distance={1}
      loop
    />
  );
}
