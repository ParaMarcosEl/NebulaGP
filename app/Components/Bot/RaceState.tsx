/* eslint-disable @typescript-eslint/no-unused-vars */
// fsm/RaceState.ts
import * as THREE from 'three';
import { BaseState } from '@/Lib/StateMachine/BaseState';

export class RaceState implements BaseState {
  bot: THREE.Object3D;
  curve: THREE.Curve<THREE.Vector3>;
  t = 0;
  speed = 0.0005;
  controlsEnabled = false;

  private time = 0;
  private noiseAmplitude = 0;
  private noiseFrequency = 1;

  constructor(
    bot: THREE.Object3D,
    curve: THREE.Curve<THREE.Vector3>,
    controlsEnabled: boolean,
    _speed?: number,
  ) {
    this.bot = bot;
    this.curve = curve;
    this.controlsEnabled = controlsEnabled;
    if (_speed) this.speed = _speed;
  }

  onEnter() {
    console.log('🏁 Entered Race State');
  }

  onExit() {
    console.log('🏁 Exited Race State');
  }

  handleCollision(other: THREE.Object3D): void {}

  handleInput(): void {}

  handlePhysics(): void {}

  handleTrigger(other: THREE.Object3D): void {}

  handleUpdate(delta: number): void {
    if (!this.controlsEnabled) return;
    this.time += delta;
    this.t = (this.t + this.speed) % 1;

    const pos = this.curve.getPointAt(this.t);
    const tangent = this.curve.getTangentAt(this.t).normalize();

    // Get a side vector perpendicular to the tangent (right-hand rule)
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Compute oscillating offset
    const offset = side.multiplyScalar(
      Math.sin(this.time * this.noiseFrequency) * this.noiseAmplitude,
    );
    const noisyPos = pos.clone().add(offset);

    // Update bot position and rotation
    this.bot.position.copy(pos.clone());
    this.bot.lookAt(noisyPos.clone().add(tangent));

    this.bot.userData.curvePosition = pos.clone(); // raw on-curve position
    this.bot.userData.progress = this.t;
  }

  onUpdate(delta: number) {}
}
