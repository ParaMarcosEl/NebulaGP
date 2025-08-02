// store/useStateMachineStore.ts
import { create } from 'zustand';
import { BaseState } from '@/Lib/StateMachine/BaseState';

interface StateMachineStore {
  currentState: BaseState | null;
  setState: (newState: BaseState) => void;
}

export const useStateMachineStore = create<StateMachineStore>((set, get) => ({
  currentState: null,
  setState: (newState: BaseState) => {
    const prevState = get().currentState;
    if (prevState === newState) return;

    prevState?.onExit?.();
    newState.onEnter?.();

    set({ currentState: newState });
  },
}));
