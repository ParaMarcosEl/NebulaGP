/* eslint-disable @typescript-eslint/no-unused-vars */
// fsm/IdleState.ts
import { Object3D } from 'three';
import { BaseState } from '@/Lib/StateMachine/BaseState';

export class IdleState implements BaseState {
  onEnter() {
    console.log('🛑 Entered Idle State');
  }

  onExit() {
    console.log('➡️ Exiting Idle State');
  }

  handleInput(): void {}

  handleCollision(other: Object3D): void {}

  handlePhysics(): void {}

  handleTrigger(other: Object3D): void {}

  handleUpdate(delta: number): void {}
}
