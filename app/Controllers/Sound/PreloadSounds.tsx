// 'use client';

// import { useEffect } from 'react';
// import { useSoundStore } from './SoundController';

// export function PreloadSounds() {
//   const { listener, loadSound } = useSoundStore();

//   useEffect(() => {
//     if (!listener) return; // Wait until listener is ready
//     loadSound('engine', '/sound/sfx/engine_01.mp3', true);
//   }, [listener, loadSound]);

//   return null;
// }
