import { create } from 'zustand';

type IntroGateState = {
  audioPromptVisible: boolean;
  audioPromptResolved: boolean;
  setAudioPromptVisible: (visible: boolean) => void;
  resolveAudioPrompt: () => void;
};

export const useIntroGateStore = create<IntroGateState>((set) => ({
  audioPromptVisible: false,
  audioPromptResolved: false,
  setAudioPromptVisible: (visible) => set({ audioPromptVisible: visible }),
  resolveAudioPrompt: () => set({ audioPromptVisible: false, audioPromptResolved: true }),
}));
