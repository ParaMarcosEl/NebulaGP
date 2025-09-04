// useAudioBuffers.ts
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from './useAudioStore';
import { useEffect } from 'react';

export function useAudioBuffers() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [
    engine,
    lazer,
    explosion,
    clank01,
    clank02,
    clank03,
    clank04,
    clank05,
    clank06,
    clank07,
    clank08,
    shield,
    mineDrop,
    speedup01,
    speedup02

  ] = useLoader(THREE.AudioLoader, [
    '/sound/sfx/engine_02.mp3',
    '/sound/sfx/lazer.mp3',
    '/sound/sfx/mineHit.mp3',
    '/sound/sfx/clank01.mp3',
    '/sound/sfx/clank02.mp3',
    '/sound/sfx/clank03.mp3',
    '/sound/sfx/clank04.mp3',
    '/sound/sfx/clank05.mp3',
    '/sound/sfx/clank06.mp3',
    '/sound/sfx/clank07.mp3',
    '/sound/sfx/clank08.mp3',
    '/sound/sfx/shield.mp3',
    '/sound/sfx/mine_drop.mp3',
    '/sound/sfx/speedup01.mp3',
    '/sound/sfx/speedup02.mp3',
  ]);

  const setBuffer = useAudioStore((s) => s.setBuffer);

  useEffect(() => {
    setBuffer('engine', engine);
    setBuffer('lazer', lazer);
    setBuffer('explosion', explosion);
    setBuffer('clank01', clank01);
    setBuffer('clank02', clank02);
    setBuffer('clank03', clank03);
    setBuffer('clank04', clank04);
    setBuffer('clank05', clank05);
    setBuffer('clank06', clank06);
    setBuffer('clank07', clank07);
    setBuffer('clank08', clank08);
    setBuffer('shield', shield);
    setBuffer('mineDrop', mineDrop);
    setBuffer('speedup01', speedup01);
    setBuffer('speedup02', speedup02);
  }, [
    engine,
    lazer,
    explosion,
    setBuffer,
    clank01,
    clank02,
    clank03,
    clank04,
    clank05,
    clank06,
    clank07,
    clank08,
    shield,
    mineDrop,
    speedup01,
    speedup02
  ]);

  return {
    engine,
    lazer,
    explosion,
    clank01,
    clank02,
    clank03,
    clank04,
    clank05,
    clank06,
    clank07,
    clank08,
    shield,
    mineDrop,
    speedup01,
    speedup02,
  };
}
