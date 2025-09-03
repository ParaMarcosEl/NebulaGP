import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import { PositionalAudio } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function EngineSound({ volume = 20 }: { volume?: number }) {
  const ref = useRef<THREE.PositionalAudio>(null);
  const { audioEnabled, masterVolume, sfxVolume } = useAudioStore();

  // 🔹 Reactively adjust volume
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.setVolume(volume * masterVolume * sfxVolume);
  }, [masterVolume, sfxVolume, volume]);

  // 🔹 Play/stop based on audioEnabled
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
      url="/sound/sfx/engine_02.mp3"
      distance={1}
      loop
    />
  );
}
