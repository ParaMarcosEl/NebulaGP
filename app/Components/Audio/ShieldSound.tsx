// EngineSound.tsx
import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import { PositionalAudio } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ShieldSound({ buffer, volume = 20 }: { buffer: AudioBuffer; volume?: number }) {
  const ref = useRef<THREE.PositionalAudio>(null);
  const { audioEnabled } = useAudioStore();

  useEffect(() => {
    if (!audioEnabled) {
      if (ref.current) {
        ref.current.stop();
      }
      return;
    }

    if (ref.current && buffer) {
      ref.current.setBuffer(buffer);
      ref.current.setLoop(true);
      ref.current.setVolume(volume);
      if (!ref.current.isPlaying) ref.current.play();
    }
  }, [audioEnabled, buffer, volume]);

  return <PositionalAudio distance={1} loop url="/sound/sfx/shield.mp3" ref={ref} />;
}
