// // stores/useAudioStore.ts
// import { create } from 'zustand';
// import * as THREE from 'three';

// // ... other types

// export type AudioStore = {
//   listener: THREE.AudioListener | null;
//   audioLoader: THREE.AudioLoader | null;
//   sounds: Map<string, THREE.PositionalAudio | THREE.Audio>;
//   audioBuffers: Map<string, AudioBuffer>; // Add this line
//   isInitialized: boolean;

//   initializeAudio: () => void;
//   addSound: (
//     name: string,
//     url: string,
//     mesh?: THREE.Object3D,
//     options?: {
//         volume?: number;
//         loop?: boolean;
//         refDistance?: number; // for positional audio
//         positional?: boolean; // default true
//     }
//   ) => Promise<void>;
//   playSound: (name: string) => void;
//   stopSound: (name: string) => void;
// };

// export const useAudioStore = create<AudioStore>((set, get) => ({
//   listener: null,
//   audioLoader: null,
//   sounds: new Map(),
//   audioBuffers: new Map(), // Initialize the new Map
//   isInitialized: false,

//   initializeAudio: () => {
//     if (get().isInitialized) return;

//     const listener = new THREE.AudioListener();
//     const audioLoader = new THREE.AudioLoader();

//     set({ listener, audioLoader, isInitialized: true });
//     console.log('Audio listener and loader initialized.');

//   },

//   addSound: async (name, url, mesh, options = {}) => {
//     const { listener, audioLoader, sounds, audioBuffers } = get();

//     if (!listener || !audioLoader) {
//       console.error('Audio not initialized. Please call initializeAudio() first.');
//       return;
//     }

//     // Check if the audio buffer is already loaded
//     let buffer = audioBuffers.get(url);
//     if (!buffer) {
//       try {
//         // If not, load it and store it in the cache
//         buffer = await audioLoader.loadAsync(url);
//         audioBuffers.set(url, buffer);
//         console.log(`Audio buffer for '${url}' loaded and cached.`);
//       } catch (error) {
//         console.error(`Failed to load audio buffer from '${url}':`, error);
//         return;
//       }
//     }

//     const isPositional = options.positional ?? true;
//     const sound = isPositional
//       ? new THREE.PositionalAudio(listener)
//       : new THREE.Audio(listener);

//     // Use the loaded buffer
//     sound.setBuffer(buffer);
//     sound.setVolume(options.volume ?? 0.5);
//     sound.setLoop(options.loop ?? false);

//     if (sound instanceof THREE.PositionalAudio) {
//       sound.setRefDistance(options.refDistance ?? 10);
//       if (mesh) {
//         mesh.add(sound);
//       } else {
//         listener.add(sound);
//       }
//     }

//     // Update store
//     const newSounds = new Map(sounds);
//     newSounds.set(name, sound);
//     set({ sounds: newSounds, audioBuffers });

//     console.log(`Sound '${name}' created using cached buffer.`);
//   },

//   playSound: (name) => {
//     const sound = get().sounds.get(name);
//     if (sound) {
//       if (sound.isPlaying) sound.stop();
//       sound.play();
//       console.log(`Playing sound '${name}'.`);
//     } else {
//       console.error(`Sound '${name}' not found.`);
//     }
//   },

//   stopSound: (name) => {
//     const sound = get().sounds.get(name);
//     if (sound && sound.isPlaying) {
//       sound.stop();
//       console.log(`Stopped sound '${name}'.`);
//     }
//   },
// }));
