import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useRecords } from '@/Controllers/Records/useRecords';
import { useUserStore } from '@/Controllers/Users/useUserStore';

type GhostRecorderOptions = {
  trackId: number;
  mode: 'record' | 'playback';
  targetRef: React.RefObject<THREE.Object3D>;
  sampleRate?: number; // ms between samples (default 50ms)
  maxFrames?: number; // preallocate size for recording
  onRecordingComplete?: () => void;
};

export function useGhostRecorder({
  trackId,
  mode,
  targetRef,
  sampleRate = 50,
  maxFrames = 20000, // ~16 minutes at 20fps
  onRecordingComplete,
}: GhostRecorderOptions) {
  const [recorded, setRecorded] = useState(false);
  const [racePlayback, setRacePlayback] = useState<{
    time: number;
    frames: Float32Array<ArrayBuffer>;
  } | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(maxFrames * 7));
  const frameCount = useRef(0);
  const lastSampleTime = useRef(0);
  const startTime = useRef<number | null>(null);
  const { raceData, setGhostLoaded } = useGameStore((s) => s);
  const { createRecord, records, updateRecord, loading, fetchRecords } = useRecords();
  const { user } = useUserStore();
  const bestTime = racePlayback?.time;
  const playback = racePlayback?.frames;

  useEffect(() => {
    fetchRecords(user?.id, trackId.toString());
  }, []);

  useEffect(() => {
    if (loading || !records || !records.length || false) return;

    const { ghostFrames, totalTime } = records?.[0];
    if (!ghostFrames || !totalTime) return;
    setRacePlayback({ time: totalTime, frames: new Float32Array(ghostFrames || []) });
    setGhostLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, loading]);

  // RECORD MODE
  useFrame((state) => {
    if (mode !== 'record' || !targetRef.current) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime * 1000;

    const elapsed = state.clock.elapsedTime * 1000 - (startTime?.current) || 0;
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
    if (mode !== 'playback' || !targetRef.current || !playback) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime * 1000;

    const elapsed = state.clock.elapsedTime * 1000 - (startTime?.current || 0);

    let idx = -1;
    for (let i = 0; i < playback.length; i += 7) {
      if (playback[i] > elapsed) {
        idx = i / 7;
        break;
      }
    }
    if (idx <= 0) {
      targetRef.current.position.set(playback[1], playback[2], playback[3]);
      targetRef.current.rotation.set(playback[4], playback[5], playback[6]);
      return;
    }
    if (idx >= playback.length / 7) return;

    const base1 = (idx - 1) * 7;
    const base2 = idx * 7;
    const t1 = playback[base1];
    const t2 = playback[base2];
    const alpha = (elapsed - t1) / (t2 - t1);

    targetRef.current.position.set(
      playback[base1 + 1] + (playback[base2 + 1] - playback[base1 + 1]) * alpha,
      playback[base1 + 2] + (playback[base2 + 2] - playback[base1 + 2]) * alpha,
      playback[base1 + 3] + (playback[base2 + 3] - playback[base1 + 3]) * alpha,
    );

    targetRef.current.rotation.set(
      playback[base1 + 4] + (playback[base2 + 4] - playback[base1 + 4]) * alpha,
      playback[base1 + 5] + (playback[base2 + 5] - playback[base1 + 5]) * alpha,
      playback[base1 + 6] + (playback[base2 + 6] - playback[base1 + 6]) * alpha,
    );
  });

  // Stop & save recording
  const stopRecording = () => {
    if (recorded || !user) return;
    setRecorded(true);

    if (mode === 'record' && onRecordingComplete) {
      const recorded = bufferRef.current.slice(0, frameCount.current * 7);
      const history = raceData[0].history;
      const lapTimes = history.map(({ time }) => time);
      const totalTime = history.reduce((prev, curr) => prev + curr.time, 0);
      console.log({ totalTime, bestTime, user, records });
      const userRecord = records.find((record) => record.userId === user?.id);

      if (totalTime > (userRecord?.totalTime || Infinity)) return;

      const recordData = {
        userId: user?.id || '-undefined-',
        name: user?.displayName || '-undefined-',
        trackId: trackId.toString(),
        totalTime,
        lapTimes,
        ghostFrames: Array.from(recorded),
      };

      if (userRecord) {
        console.log('user record found. updating record.');
        updateRecord(userRecord.id, recordData);
      } else {
        console.log('no record found for user. creating record.');
        createRecord(recordData);
      }
    }
  };

  // Reset on mode change
  useEffect(() => {
    return;
    bufferRef.current = new Float32Array(maxFrames * 7);
    frameCount.current = 0;
    lastSampleTime.current = 0;
    startTime.current = null;
  }, [maxFrames, mode]);

  return { stopRecording };
}
