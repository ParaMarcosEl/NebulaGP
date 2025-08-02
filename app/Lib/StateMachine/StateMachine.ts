import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { BaseState } from './BaseState';

export function useStateMachine(initialState: BaseState) {
  const currentState = useRef<BaseState>(initialState);

  const setState = (newState: BaseState) => {
    if (currentState.current === newState) return;
    currentState.current?.onExit();
    currentState.current = newState;
    currentState.current.onEnter();
  };

  const update = (delta: number) => {
    currentState.current.handleUpdate?.(delta);
  };

  useEffect(() => {
    currentState.current?.onEnter();
    return () => currentState.current?.onExit();
  }, []);

  useFrame((_, delta) => {
    currentState.current?.handleInput();
    currentState.current?.handleUpdate(delta);
    currentState.current?.handlePhysics();
  });

  return { currentState, setState, update };
}
