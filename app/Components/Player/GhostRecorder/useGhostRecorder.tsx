import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type GhostRecorderOptions = {
  mode: "record" | "playback";
  targetRef: React.RefObject<THREE.Object3D>;
  ghostData?: Float32Array; // playback mode
  sampleRate?: number; // ms between samples (default 50ms)
  maxFrames?: number; // preallocate size for recording
  onRecordingComplete?: (data: Float32Array) => void;
};

export function useGhostRecorder({
  mode,
  targetRef,
  ghostData,
  sampleRate = 50,
  maxFrames = 20000, // ~16 minutes at 20fps
  onRecordingComplete
}: GhostRecorderOptions) {
  const bufferRef = useRef<Float32Array>(new Float32Array(maxFrames * 7));
  const frameCount = useRef(0);
  const lastSampleTime = useRef(0);
  const startTime = useRef<number | null>(null);

  // RECORD MODE
  useFrame((state) => {
    if (mode !== "record" || !targetRef.current) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime * 1000;

    const elapsed = state.clock.elapsedTime * 1000 - startTime.current;
    if (elapsed - lastSampleTime.current >= sampleRate) {
      const offset = frameCount.current * 7;
      bufferRef.current[offset] = elapsed;
      bufferRef.current[offset + 1] = targetRef.current.position.x;
      bufferRef.current[offset + 2] = targetRef.current.position.y;
      bufferRef.current[offset + 3] = targetRef.current.position.z;
      bufferRef.current[offset + 4] = targetRef.current.rotation.x;
      bufferRef.current[offset + 5] = targetRef.current.rotation.y;
      bufferRef.current[offset + 6] = targetRef.current.rotation.z;

      frameCount.current++;
      lastSampleTime.current = elapsed;
    }
  });

  // PLAYBACK MODE
  useFrame((state) => {
    if (mode !== "playback" || !targetRef.current || !ghostData) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime * 1000;

    const elapsed = state.clock.elapsedTime * 1000 - startTime.current;

    let idx = -1;
    for (let i = 0; i < ghostData.length; i += 7) {
      if (ghostData[i] > elapsed) {
        idx = i / 7;
        break;
      }
    }
    if (idx <= 0) {
      targetRef.current.position.set(ghostData[1], ghostData[2], ghostData[3]);
      targetRef.current.rotation.set(ghostData[4], ghostData[5], ghostData[6]);
      return;
    }
    if (idx >= ghostData.length / 7) return;

    const base1 = (idx - 1) * 7;
    const base2 = idx * 7;
    const t1 = ghostData[base1];
    const t2 = ghostData[base2];
    const alpha = (elapsed - t1) / (t2 - t1);

    targetRef.current.position.set(
      ghostData[base1 + 1] + (ghostData[base2 + 1] - ghostData[base1 + 1]) * alpha,
      ghostData[base1 + 2] + (ghostData[base2 + 2] - ghostData[base1 + 2]) * alpha,
      ghostData[base1 + 3] + (ghostData[base2 + 3] - ghostData[base1 + 3]) * alpha
    );

    targetRef.current.rotation.set(
      ghostData[base1 + 4] + (ghostData[base2 + 4] - ghostData[base1 + 4]) * alpha,
      ghostData[base1 + 5] + (ghostData[base2 + 5] - ghostData[base1 + 5]) * alpha,
      ghostData[base1 + 6] + (ghostData[base2 + 6] - ghostData[base1 + 6]) * alpha
    );
  });

  // Stop & save recording
  const stopRecording = () => {
    if (mode === "record" && onRecordingComplete) {
      const recorded = bufferRef.current.slice(0, frameCount.current * 7);
      onRecordingComplete(recorded);
    }
  };

  // Reset on mode change
  useEffect(() => {
    bufferRef.current = new Float32Array(maxFrames * 7);
    frameCount.current = 0;
    lastSampleTime.current = 0;
    startTime.current = null;
  }, [maxFrames, mode]);

  return { stopRecording };
}
