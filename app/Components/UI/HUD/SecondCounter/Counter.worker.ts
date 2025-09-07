// timer.worker.ts
self.onmessage = (e: MessageEvent) => {
  const { sharedBuffer } = e.data;
  const counter = new Int32Array(sharedBuffer);

  // Increment the counter every second
  setInterval(() => {
    Atomics.add(counter, 0, 1); // increment the first value
    Atomics.notify(counter, 0); // notify any waiting thread
  }, 1000);
};
