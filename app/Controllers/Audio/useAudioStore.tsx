import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      listener: null,
      buffers: {},
      masterVolume: 1,
      sfxVolume: 1,
      musicVolume: 1,
      audioEnabled: false,

      setListener: (listener) => set({ listener }),
      setBuffer: (name, buffer) =>
        set((state) => ({ buffers: { ...state.buffers, [name]: buffer } })),
      setMasterVolume: (v) => set({ masterVolume: Math.max(0, Math.min(v, 1)) }),
      setSfxVolume: (v) => set({ sfxVolume: Math.max(0, Math.min(v, 1)) }),
      setMusicVolume: (v) => set({ musicVolume: Math.max(0, Math.min(v, 1)) }),
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),

      tracks,
      currentTrack: 0,
      isPlaying: false,
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
    }),
    {
      name: 'audio-storage', // localStorage key
      partialize: (state) => ({
        masterVolume: state.masterVolume,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
        audioEnabled: state.audioEnabled,
      }),
    }
  )
);
