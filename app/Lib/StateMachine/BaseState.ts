import * as THREE from 'three';

export abstract class BaseState {
  abstract onEnter(): void;
  abstract onExit(): void;
  abstract handleInput(): void;
  abstract handleUpdate(delta: number): void;
  abstract handlePhysics(): void;
  abstract handleCollision?(other: THREE.Object3D): void;
  abstract handleTrigger?(other: THREE.Object3D): void;
}
