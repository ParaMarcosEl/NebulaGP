// src/game/particles/ParticlePool.ts
export type EmitterConfig = {
  position: [number, number, number];
  direction?: [number, number, number];
  speed?: number;
  maxDistance?: number;
  duration?: number; // seconds
  startTime?: number; // seconds (set by spawn)
};

export class ParticlePool {
  private active: boolean[];
  private configs: Array<EmitterConfig | null>;
  readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.active = Array(capacity).fill(false);
    this.configs = Array(capacity).fill(null);
  }

  /** returns slot index or -1 if pool is full */
  spawn(config: Omit<EmitterConfig, 'startTime'>) {
    const idx = this.active.indexOf(false);
    if (idx === -1) return -1;
    this.active[idx] = true;
    this.configs[idx] = { ...config, startTime: performance.now() / 1000 };
    return idx;
  }

  release(index: number) {
    if (index < 0 || index >= this.capacity) return;
    this.active[index] = false;
    this.configs[index] = null;
  }

  isActive(index: number) {
    return this.active[index];
  }

  getConfig(index: number) {
    return this.configs[index];
  }

  getActiveIndices() {
    const out: number[] = [];
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i]) out.push(i);
    }
    return out;
  }
}

export const thrusterPool = new ParticlePool(20);