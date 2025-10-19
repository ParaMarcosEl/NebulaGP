'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BotInit } from '@/Constants';

type UseBotsWorkerControllerProps = {
  botsInit: BotInit[];
  botRefs: React.RefObject<THREE.Group | null>[];
  curve: THREE.Curve<THREE.Vector3>;
  onBotFire: (botId: number) => void;
  onBotDropMine: (botId: number) => void;
};

export function useBotsWorkerController({
  botsInit,
  botRefs,
  curve,
  onBotFire,
  onBotDropMine,
}: UseBotsWorkerControllerProps) {
  const trackWaypoints = useMemo(() => curve.getPoints(100), [curve]);

  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);

  const positionBufferRef = useRef<Float32Array | null>(null);
  const quaternionBufferRef = useRef<Float32Array | null>(null);

  // --- Setup worker once ---
  useEffect(() => {
    if (workerRef.current) return;

    console.log('[useBotsWorkerController] Initializing worker...');
    const worker = new Worker(new URL('@/workers/BotWorker.worker.ts', import.meta.url));
    workerRef.current = worker;

    const numBots = botsInit.length;
    const positionSAB = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * numBots * 3);
    const quaternionSAB = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * numBots * 4);
    positionBufferRef.current = new Float32Array(positionSAB);
    quaternionBufferRef.current = new Float32Array(quaternionSAB);

    // --- Handle messages from worker ---
    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      console.log('[BotWorker → Main]', e.data);

      switch (type) {
        case 'ready':
          console.log('[useBotsWorkerController] Worker ready, sending init...');
          readyRef.current = true;

          const waypointsFlat = trackWaypoints.flatMap((v) => v.toArray());
          worker.postMessage({
            type: 'init',
            bots: botsInit,
            sharedBuffers: {
              position: positionSAB,
              quaternion: quaternionSAB,
            },
            waypoints: waypointsFlat,
          });

          console.log(`[useBotsWorkerController] Worker init sent for ${numBots} bots`);
          break;

        case 'bot_events':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload.forEach((ev: any) => {
            if (ev.fire) onBotFire(ev.id);
            if (ev.dropMine) onBotDropMine(ev.id);
          });
          break;

        default:
          console.warn('[BotWorker] Unknown message type', type);
      }
    };

    return () => {
      console.log('[useBotsWorkerController] Terminating worker...');
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, [botsInit, curve]);

  // --- Frame update using R3F ---
  useFrame((_, delta) => {
    const worker = workerRef.current;
    if (!worker || !readyRef.current) return;

    worker.postMessage({ type: 'update', delta });

    const posArray = positionBufferRef.current;
    const quatArray = quaternionBufferRef.current;

    if (!posArray || !quatArray) return;

    for (let i = 0; i < botsInit.length; i++) {
      const ref = botRefs[i]?.current;
      if (!ref) continue;

      const p = i * 3;
      const q = i * 4;
      ref.position.set(posArray[p], posArray[p + 1], posArray[p + 2]);
      ref.quaternion.set(quatArray[q], quatArray[q + 1], quatArray[q + 2], quatArray[q + 3]);
    }
  });
}
