'use client';

import React, { useRef, useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import { getStartPoseFromCurve } from '@/Utils';
import { tracks } from '@/Lib/flightPath';
import { Skybox } from '@/Components/Skybox/Skybox';
import { useGameStore } from '@/Controllers/Game/GameController';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import SpeedPadSpawner from '@/Components/SpeedPad/speedPadSpawner';
import { Mine } from '@/Components/Weapons/useMines';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
import ParticleSystem from '@/Components/Particles/ParticleSystem';
import Planet from '@/Components/World/Planet/WorldPlanet';
import { HUDUI } from '@/Components/UI/HUD/HUDUI';
import ExplosionParticles, {
  ExplosionHandle,
} from '@/Components/Particles/ExplosionParticles/ExplosionParticles';
import { InitAudio } from '@/Components/Audio/InitAudio';
// import Bots from '@/Components/Player/Bots/Bots';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ShipTracker } from '@/Components/ShipTracker/ShipTracker';
import { PerformanceOverlay } from '@/Components/UI/Performance/PerformanceOverlay';
import { PerformanceTracker } from '@/Components/UI/Performance/PerformanceTracker';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';
import Bots from '@/Components/Player/Bots/Bots';
import { FBMParams } from '@/Components/LODTerrain/Planet/fbm';

// -------------------------
// Helper: throttle hook for values that update fast
// This returns a stable value that only updates at most `fps` times per second
// -------------------------
export function useThrottledValue<T>(value: T, fps = 10) {
  const [throttled, setThrottled] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    last.current = value;
  }, [value]);

  useEffect(() => {
    let mounted = true;
    const interval = 1000 / fps;
    const id = setInterval(() => {
      if (!mounted) return;
      // shallow compare reference -- replace with custom comparator if needed
      if (last.current !== throttled) setThrottled(last.current as T);
    }, interval);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [fps, throttled]);

  return throttled;
}

// -------------------------
// Scene: heavy 3D content — memoized so it doesn't re-render when UI updates
// Scene should avoid subscribing to fast-changing stores; let children subscribe individually
// -------------------------
const Scene = React.memo(function Scene({
  playerRefs,
  minePoolRef,
  explosionsRef,
  startPositions,
  onSpeedChange,
}: {
  playerRefs: React.RefObject<THREE.Group | null>[];
  minePoolRef: React.RefObject<Mine[]>;
  explosionsRef: React.RefObject<ExplosionHandle>;
  startPositions: {
    position: THREE.Vector3 | [number, number, number];
    quaternion: THREE.Quaternion;
  }[];
  onSpeedChange: (s: number) => void;
}) {
  // local refs that only Scene owns
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const fbmParams: FBMParams = {
    uTime: 0.0,
    uFrequency: 4,
    uAmplitude: .1,
    uOctaves: 2,
    uLacunarity: 1.1,
    uPersistence: .7,
    uExponentiation: 6,
    uMaxHeight: 80,
    useRidged: true,
  }

  // create boosters once
  const boosters = useMemo(
    () =>
      playerRefs.map((player, id) => (
        <ParticleSystem
          lifetime={0.2}
          maxDistance={1}
          texturePath="/textures/exploded128.png"
          key={id + 'booster'}
          speed={10}
          startSize={20}
          endSize={3}
          target={player as React.RefObject<THREE.Object3D>}
          emissionRate={200}
        />
      )),
    [playerRefs], // only recreated if refs array identity changes
  );

  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, width: '100%', height: '100%' }}
      camera={{ position: [0, 5, 15], fov: 60 }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.sortObjects = true;
      }}
    >
      <Suspense fallback={null}>
        <InitAudio />
        <PerformanceTracker />

        <ambientLight intensity={0.5} />
        <directionalLight position={[150, 0, 0]} intensity={0.5} />
        <pointLight position={[-10, 5, -10]} intensity={0.3} />

        <Skybox stageName="stageI" />

        <Track
          playerRefs={playerRefs as React.RefObject<THREE.Object3D>[]}
          ref={playingFieldRef}
          spheres={[{ t: 0.4, radius: 100 }]}
          onRaceComplete={() => {
            // keep heavy completion logic out of rerenders — you can dispatch/store updates here
          }}
        />
        <Planet
          position={new THREE.Vector3(0, 0, 0)}
          size={320}
          octaves={fbmParams.uOctaves}
          persistence={fbmParams.uPersistence}
          amplitude={fbmParams.uAmplitude}
          maxHeight={fbmParams.uMaxHeight}
          lacunarity={fbmParams.uLacunarity}
          frequency={fbmParams.uFrequency}
          exponentiation={fbmParams.uExponentiation}
          lowTextPath="/textures/granite_ground128.png"
          midTextPath="/textures/gold_ground128.png"
          highTextPath="/textures/ruby_ground128.png"
        />

        <Aircraft
          fbmParams={fbmParams}
          planetSize={320}
          id={0}
          trackId={0}
          aircraftRef={playerRefs[0]}
          playerRefs={playerRefs}
          minePoolRef={minePoolRef}
          explosionsRef={explosionsRef}
          playingFieldRef={playingFieldRef}
          startPosition={startPositions[0].position as [number, number, number]}
          startQuaternion={startPositions[0].quaternion}
          acceleration={0.1}
          damping={0.99}
          onSpeedChange={onSpeedChange}
          botSpeed={2}
        />

        <Bots
          playerRefs={playerRefs}
          minePoolRef={minePoolRef}
          startPositions={startPositions}
        />

        {boosters}

        <ExplosionParticles ref={explosionsRef} />
        <FollowCamera targetRef={playerRefs[0]} />
      </Suspense>
    </Canvas>
  );
});

// -------------------------
// HUD wrapper — subscribes to just the slices it needs and receives throttled props
// -------------------------
const HUD = React.memo(function HUD({
  playerRefs,
  trackId,
}: {
  playerRefs: React.RefObject<THREE.Group | null>[];
  trackId: number;
  curve: THREE.Curve<THREE.Vector3>;
}) {
  return (
    <HUDUI
      playerRefs={playerRefs}
      trackId={trackId}
    />
  );
});

// -------------------------
// Top-level Stage (thin) — orchestrates and mounts Scene and HUD separately
// -------------------------
export default function Stage1Optimized() {
  // stable refs for players
  const aircraftRef = useRef<THREE.Group | null>(null);
  const botRefs = useRef<Array<React.RefObject<THREE.Group | null>>>([]);
  // ensure fixed length refs
  if (botRefs.current.length === 0) {
    for (let i = 0; i < 7; i++) botRefs.current.push(React.createRef<THREE.Group>());
  }
  const playerRefs = useMemo(() => [aircraftRef, ...botRefs.current], []);

  const minePoolRef = useRef<Mine[]>([]);
  const explosionsRef = useRef<ExplosionHandle>(null);

  const { loader } = useCanvasLoader();

  // subscribe only to the small parts of the store this top-level needs
  const curve = useGameStore((s) => s.track);
  const setTrack = useGameStore((s) => s.setTrack);
  const setMaterialLoaded = useGameStore((s) => s.setMaterialLoaded);
  const reset = useGameStore((s) => s.reset);
  const setRaceComplete = useGameStore((s) => s.setRaceComplete);
  const setPlanetMeshes = usePlanetStore((s) => s.setPlanetMeshes);
  const setTouchEnabled = useGameStore((s) => s.setTouchEnabled);

  // local UI state that is safe to update occasionally
  const [speed, setSpeed] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const throttledSpeed = useThrottledValue(speed, 12);

  useEffect(() => {
    setTrack(tracks[0]);
    setMaterialLoaded(true);
    reset();
    return () => {
      setMaterialLoaded(false);
      setRaceComplete(false);
      setPlanetMeshes([]);
    };
  }, [reset, setTrack, setMaterialLoaded, setRaceComplete, setPlanetMeshes]);

  useEffect(() => {
    if ('ontouchstart' in window) setTouchEnabled(true);
    return () => setTouchEnabled(false);
  }, [setTouchEnabled]);

  // start positions memoized from curve
  const startPositions = useMemo(
    () => playerRefs.map((ref, i) => getStartPoseFromCurve(curve, 0.01 + i * 0.01)),
    [curve, playerRefs],
  );

  // obstacle positions memoized
  const bounds = useMemo(() => ({ x: 500, y: 250, z: 500 }), []);
  const obstaclePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 500; i++)
      positions.push([
        (Math.random() * 2 - 1) * bounds.x,
        (Math.random() * 2 - 1) * bounds.y,
        (Math.random() * 2 - 1) * bounds.z,
      ]);
    return positions;
  }, [bounds.x, bounds.y, bounds.z]);

  // build obstacle refs once
  const obstacleRefs = useRef<React.RefObject<THREE.Mesh | null>[]>([]);
  if (obstacleRefs.current.length !== obstaclePositions.length)
    obstacleRefs.current = obstaclePositions.map(() => React.createRef<THREE.Mesh>());

  // callback passed into Scene (stable)
  const handleSpeedChange = useCallback((s: number) => setSpeed(s), []);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* UI — keep outside of the Canvas so UI updates don't force Canvas children to re-evaluate */}
      <HUD playerRefs={playerRefs} trackId={0} curve={curve} />
      {loader}

      {/* Scene is memoized and will not remount/re-render on every UI change */}
      <Scene
        playerRefs={playerRefs}
        minePoolRef={minePoolRef}
        explosionsRef={explosionsRef as React.RefObject<ExplosionHandle>}
        startPositions={startPositions}
        onSpeedChange={handleSpeedChange}
      />

      <PerformanceOverlay />
    </main>
  );
}
