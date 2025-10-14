// BVHQueue.ts
import { Mesh } from 'three';
import { buildBVHAsync } from './BVHBuilder';

class BVHQueue {
  private queue: Mesh[] = [];
  private isProcessing = false;
  private maxPerFrame = 2; // limit builds per frame

  enqueue(mesh: Mesh) {
    this.queue.push(mesh);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxPerFrame);
      for (const mesh of batch) {
        await buildBVHAsync(mesh);
      }
      // Yield to the main loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    this.isProcessing = false;
  }
}

export const bvhQueue = new BVHQueue();
