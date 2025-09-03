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

    nebula01,
    nebula02,
    nebula03,
    nebula04,
    nebula05,
    nebula06,
    nebula07,
    nebula08,
    nebula09,
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
    '/sound/music/nebula01.mp3',
    '/sound/music/nebula01.mp3',
    '/sound/music/nebula03.mp3',
    '/sound/music/nebula04.mp3',
    '/sound/music/nebula05.mp3',
    '/sound/music/nebula06.mp3',
    '/sound/music/nebula07.mp3',
    '/sound/music/nebula08.mp3',
    '/sound/music/nebula09.mp3',
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
    setBuffer('nebula01', nebula01);
    setBuffer('nebula02', nebula02);
    setBuffer('nebula03', nebula03);
    setBuffer('nebula04', nebula04);
    setBuffer('nebula05', nebula05);
    setBuffer('nebula06', nebula06);
    setBuffer('nebula07', nebula07);
    setBuffer('nebula08', nebula08);
    setBuffer('nebula09', nebula09);
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

    nebula01,
    nebula02,
    nebula03,
    nebula04,
    nebula05,
    nebula06,
    nebula07,
    nebula08,
    nebula09,
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

    nebula01,
    nebula02,
    nebula03,
    nebula04,
    nebula05,
    nebula06,
    nebula07,
    nebula08,
    nebula09,
  };
}
