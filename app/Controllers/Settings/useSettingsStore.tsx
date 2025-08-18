// stores/useSettingsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  invertPitch: number;
  touchEnabled: boolean;
  setInvertPitch: (val: number) => void;
  setTouchEnabled: (val: boolean) => void;
  loadForUser: (uid: string) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (set, get) => ({
      invertPitch: 1,
      touchEnabled: true,
      setInvertPitch: (val) => set({ invertPitch: val }),
      setTouchEnabled: (val) => set({ touchEnabled: val }),
      loadForUser: (uid: string) => {
        // Switch storage key dynamically per user
        const storageKey = `game-settings-${uid}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          set(JSON.parse(saved).state);
        } else {
          // fresh defaults
          set({ invertPitch: 1, touchEnabled: true });
        }
      },
      reset: () => set({ invertPitch: 1, touchEnabled: true }),
    }),
    {
      name: "game-settings", // default (overridden by loadForUser)
      storage: createJSONStorage(() => localStorage),
    }
  )
);
