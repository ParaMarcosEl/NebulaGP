import * as THREE from 'three';

// utils/unlockAudio.ts
export function unlockAudio() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = THREE.AudioContext.getContext() as AudioContext;

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log('AudioContext resumed');
    });
  }
}
