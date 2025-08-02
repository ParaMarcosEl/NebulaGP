/* eslint-disable @typescript-eslint/no-unused-vars */
// fsm/IdleState.ts
import { Object3D } from 'three';
import { BaseState } from '@/Lib/StateMachine/BaseState';

export class RaceState implements BaseState {
  onEnter() {
    console.log('Entered Race State');
  }

  onExit() {
    console.log('➡️ Exiting Race State');
  }

  handleInput(): void {}

  handleCollision(other: Object3D): void {}

  handlePhysics(): void {}

  handleTrigger(other: Object3D): void {}

  handleUpdate(delta: number): void {}
}
