// useAudioStore.ts
import { create } from 'zustand';
import * as THREE from 'three';

const tracks = [
  '/sound/music/nebula01.mp3',
  '/sound/music/nebula02.mp3',
  '/sound/music/nebula03.mp3',
  '/sound/music/nebula04.mp3',
  '/sound/music/nebula05.mp3',
  '/sound/music/nebula06.mp3',
  '/sound/music/nebula07.mp3',
  '/sound/music/nebula08.mp3',
  '/sound/music/nebula09.mp3',
];

type AudioState = {
  listener: THREE.AudioListener | null;
  setListener: (listener: THREE.AudioListener) => void;
  buffers: Record<string, AudioBuffer>;
  setBuffer: (name: string, buffer: AudioBuffer) => void;
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  musicVolume: number;
  setMusicVolume: (v: number) => void;

  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;

  tracks: string[];
  currentTrack: number;
  isPlaying: boolean;
  setPlaying: (playing: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setTrack: (index: number) => void;
};

export const useAudioStore = create<AudioState>((set, get) => {
  // Load saved volume from localStorage (fallback to 1)
  const savedMasterVolume =
    typeof window !== 'undefined' ? parseFloat(localStorage.getItem('masterVolume') || '1') : 1;
  const savedSfxVolume =
    typeof window !== 'undefined' ? parseFloat(localStorage.getItem('sfxVolume') || '1') : 1;
  const savedMusicVolume =
    typeof window !== 'undefined' ? parseFloat(localStorage.getItem('musicVolume') || '1') : 1;

  return {
    listener: null,
    buffers: {},
    isMusicPlaying: true,
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    audio: null,
    audioEnabled: false,
    setAudioEnabled: (enabled: boolean) => set({ audioEnabled: enabled }),

    tracks,
    currentTrack: 0,
    setPlaying: (playing) => set({ isPlaying: playing }),
    nextTrack: () => {
      const { currentTrack, tracks } = get();
      set({ currentTrack: (currentTrack + 1) % tracks.length });
    },
    prevTrack: () => {
      const { currentTrack, tracks } = get();
      set({ currentTrack: (currentTrack - 1 + tracks.length) % tracks.length });
    },
    setTrack: (index) => {
      const { tracks } = get();
      if (index >= 0 && index < tracks.length) set({ currentTrack: index });
    },

    setListener: (listener) => set({ listener }),
    setBuffer: (name, buffer) =>
      set((state) => ({ buffers: { ...state.buffers, [name]: buffer } })),
    masterVolume: savedMasterVolume,
    setMasterVolume: (v: number) => {
      const clamped = Math.max(0, Math.min(v, 1));
      set({ masterVolume: clamped });
      if (typeof window !== 'undefined') {
        localStorage.setItem('masterVolume', clamped.toString());
      }
    },
    sfxVolume: savedSfxVolume,
    setSfxVolume: (v: number) => {
      const clamped = Math.max(0, Math.min(v, 1));
      set({ sfxVolume: clamped });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sfxVolume', clamped.toString());
      }
    },
    musicVolume: savedMusicVolume,
    setMusicVolume: (v: number) => {
      const clamped = Math.max(0, Math.min(v, 1));
      set({ musicVolume: clamped });
      if (typeof window !== 'undefined') {
        localStorage.setItem('musicVolume', clamped.toString());
      }
    },
  };
});
