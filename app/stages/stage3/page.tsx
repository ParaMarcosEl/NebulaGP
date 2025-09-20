'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect, Suspense, ReactElement } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Bot from '@/Components/Player/Bot';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import { onShipCollision } from '@/Utils/collisions';
import { getStartPoseFromCurve } from '@/Utils';
import { tracks } from '@/Lib/flightPath';
import { curveType } from '@/Constants';
import { Skybox } from '@/Components/Skybox/Skybox';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useRaceProgress } from '@/Controllers/Game/RaceProgressController';
import Link from 'next/link';
import Planet from '@/Components/World/Planet';
import SpeedPadSpawner from '@/Components/SpeedPad/speedPadSpawner';
import WeaponsPadSpawner from '@/Components/WeaponPad/WeaponPadSpawner';
import { useShipCollisions } from '@/Controllers/Collision/useShipCollisions';
import ParticleSystem from '@/Components/Particles/ParticleSystem';
// import Satellite from '@/Components/World/Satellite';
// import TerrainChunkManager from '@/Components/LODTerrain/TerrainChunkManager';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
import { Mine } from '@/Components/Weapons/useMines';
import ShieldPadSpawner from '@/Components/ShieldPad/ShieldPadSpawner';
import MinePadSpawner from '@/Components/MinePad/MinePadSpawner';
import MineExplosionParticles, {
  MineExplosionHandle,
} from '@/Components/Particles/ExplosionParticles';

import { useAudioBuffers } from '@/Controllers/Audio/useAudioBuffers';
import { useAudioListener } from '@/Controllers/Audio/AudioSystem';
import { HUDUI } from '@/Components/UI/HUD/HUDUI';
// import LODPlanet from '@/Components/LODTerrain/Planet/Worker/Planet';
import WorldPlanet from '@/Components/World/Planet/WorldPlanet';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';

const InitAudio = () => {
  useAudioListener();
  useAudioBuffers();

  return null;
};

function RaceProgressTracker({
  playerRefs,
}: {
  playerRefs: React.RefObject<THREE.Group>[];
  curve: curveType;
}) {
  useRaceProgress({ playerRefs: playerRefs as React.RefObject<THREE.Group>[] });
  return null; // No rendering, just logic
}

function ShipCollisionTracker({
  playerRefs,
  onCollide,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[];
  onCollide: (a: THREE.Object3D, b: THREE.Object3D) => void;
}) {
  useShipCollisions({
    playerRefs,
    onCollide,
  });
  return null;
}

const EXPLOSION_POOL_SIZE = 100;

export default function Stage1() {
  const aircraftRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const minePoolRef = useRef<Mine[]>([]);
  const planetRef = useRef<THREE.Mesh>(null);
  const botRef1 = useRef<THREE.Group | null>(null);
  const botRef2 = useRef<THREE.Group | null>(null);
  const botRef3 = useRef<THREE.Group | null>(null);
  const botRef4 = useRef<THREE.Group | null>(null);
  const botRef5 = useRef<THREE.Group | null>(null);
  const botRef6 = useRef<THREE.Group | null>(null);
  const botRef7 = useRef<THREE.Group | null>(null);
  const { loader, setMaterialLoaded } = useCanvasLoader();
  const { setPlanetMeshes } = usePlanetStore((s) => s);

  const playerRefs = useMemo(
    () => [aircraftRef, botRef1, botRef2, botRef3, botRef4, botRef5, botRef6, botRef7],
    [],
  );

  // Correctly type the explosion pool ref as an array of RefObjects
  const explosionPoolRef = useRef<React.RefObject<MineExplosionHandle>[]>([]);

  // Use useMemo to create the components and their refs only once.
  // This ensures the refs are created before the components are rendered.
  const explosions = useMemo(() => {
    const exps: ReactElement[] = [];
    for (let i = 0; i < EXPLOSION_POOL_SIZE; i++) {
      const handle = createRef<MineExplosionHandle>();
      exps.push(<MineExplosionParticles key={i} ref={handle} />);
      explosionPoolRef.current.push(handle as React.RefObject<MineExplosionHandle>);
    }
    return exps;
  }, []);

  const bounds = { x: 500, y: 250, z: 500 };
  const {
    raceData,
    reset,
    track: curve,
    setTrack,
    setRaceComplete,
    setTouchEnabled,
  } = useGameStore((state) => state);

  useEffect(() => {
    // Enable touch only if device supports touch
    if ('ontouchstart' in window) {
      setTouchEnabled(true);
    }

    // Optional: cleanup / disable on unmount
    return () => {
      setTouchEnabled(false);
    };
  }, []);

  const positions = Object.entries(raceData)
    .map(([id, player]) => ({
      isPlayer: player.isPlayer,
      v: player.position,
      id: parseInt(id),
    }))
    .filter((pos) => pos.id >= 0);

  const obstaclePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 500; i++) {
      positions.push([
        (Math.random() * 2 - 1) * bounds.x,
        (Math.random() * 2 - 1) * bounds.y,
        (Math.random() * 2 - 1) * bounds.z,
      ]);
    }
    return positions;
  }, [bounds.x, bounds.y, bounds.z]);

  const obstacleRefs = useRef<React.RefObject<THREE.Mesh | null>[]>([]);
  if (obstacleRefs.current.length !== obstaclePositions.length) {
    obstacleRefs.current = obstaclePositions.map(() => createRef<THREE.Mesh>());
  }

  // HUD state
  const [speed, setSpeed] = useState(0);
  const startPositions = useMemo(
    () => playerRefs.map((ref, i) => getStartPoseFromCurve(curve, 0.01 + i * 0.01)),
    [curve, playerRefs],
  );

  useEffect(() => {
    setTrack(tracks[2]);
    setMaterialLoaded(true);
    reset();
    return () => {
      setMaterialLoaded(false);
      setRaceComplete(false);
      setPlanetMeshes([]);
    };
  }, [reset, setMaterialLoaded, setRaceComplete, setTrack]);

  const players = playerRefs.map((player, id) =>
    id === 0 ? (
      <Aircraft
        trackId={2}
        minePoolRef={minePoolRef}
        explosionPoolRef={explosionPoolRef}
        key={id}
        id={id}
        aircraftRef={player}
        playerRefs={playerRefs}
        curve={curve}
        obstacleRefs={obstacleRefs.current}
        playingFieldRef={playingFieldRef}
        startPosition={startPositions[id].position}
        startQuaternion={startPositions[id].quaternion}
        acceleration={0.01}
        damping={0.99}
        onSpeedChange={setSpeed}
        botSpeed={1.6}
      />
    ) : (
      <Bot
        key={id}
        minePoolRef={minePoolRef}
        explosionPoolRef={explosionPoolRef}
        id={id}
        aircraftRef={player}
        playerRefs={playerRefs}
        startPosition={startPositions[id].position}
        startQuaternion={startPositions[id].quaternion}
        curve={curve}
        isBot
        obstacleRefs={obstacleRefs.current}
        playingFieldRef={playingFieldRef}
        acceleration={0.01}
        damping={0.99}
        botSpeed={1.2 + id * 0.1}
      />
    ),
  );

  const boosters = playerRefs.map((player, id) => (
    <ParticleSystem
      lifetime={0.2}
      maxDistance={1}
      texturePath="/textures/exploded128.png"
      key={id + 'booster'}
      speed={10}
      startSize={30}
      endSize={3}
      target={player as React.RefObject<THREE.Object3D>}
      emissionRate={200}
    />
  ));

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'auto',
      }}
    >
      {/* UI */}
      <Link
        style={{
          zIndex: 1,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        href={'/stage-select'}
      >
        EXIT RACE
      </Link>
      <HUDUI
        playerRefs={playerRefs}
        trackId={2}
        positions={positions}
        curve={curve}
        speed={speed}
      />
      {loader}
      {/* Scene */}
      <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
        <Suspense fallback={null}>
          <InitAudio />
          <RaceProgressTracker
            playerRefs={playerRefs as React.RefObject<THREE.Group>[]}
            curve={curve}
          />

          <ShipCollisionTracker
            playerRefs={playerRefs as React.RefObject<THREE.Group>[]}
            onCollide={onShipCollision}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 7]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={500}
          />
          <pointLight position={[-10, 5, -10]} intensity={0.3} />

          {/* World */}
          <Skybox stageName="stageD" />
          <Track
            ref={playingFieldRef}
            playerRefs={playerRefs as React.RefObject<THREE.Object3D>[]}
            curve={curve}
            spheres={[{ t: 0.1, radius: 59 }]}
          />

          <WorldPlanet
            position={new THREE.Vector3(0, -1300, 0)}
            size={1200}
            maxHeight={300}
            lacunarity={0.6}
            amplitude={0.2}
            octaves={6}
            frequency={50}
            exponentiation={6}
            persistence={0.6}
            cloudRadius={300}
            clouds={false}
          />
          <Planet
            position={new THREE.Vector3(900, 0, 0)}
            texturePath="/stage_texture"
            size={50}
            ref={planetRef as React.RefObject<THREE.Mesh>}
            clouds={false}
            emissive
            emissiveColor="lightblue"
            emissiveIntensity={1}
          />
          <Planet
            position={new THREE.Vector3(400, 150, 800)}
            texturePath="/planet_texture01"
            size={50}
            color="purple"
            ref={planetRef as React.RefObject<THREE.Mesh>}
            clouds={false}
            emissive
            emissiveColor="lightblue"
            emissiveIntensity={1}
          />

          <MinePadSpawner
            curve={curve}
            padCount={5}
            startT={0.3}
            endT={0.85}
            playerRefs={playerRefs.map((ref, id) => ({
              id,
              ref: ref as React.RefObject<THREE.Group>,
            }))}
          />

          <SpeedPadSpawner
            curve={curve}
            padCount={16}
            startT={0.16}
            playerRefs={playerRefs.map((ref, id) => ({
              id,
              ref: ref as React.RefObject<THREE.Group>,
            }))}
          />

          <WeaponsPadSpawner
            curve={curve}
            padCount={8}
            startT={0.2}
            endT={0.9}
            playerRefs={playerRefs.map((ref, id) => ({
              id,
              ref: ref as React.RefObject<THREE.Group>,
            }))}
          />

          <ShieldPadSpawner
            curve={curve}
            padCount={2}
            startT={0.5}
            endT={0.8}
            playerRefs={playerRefs.map((ref, id) => ({
              id,
              ref: ref as React.RefObject<THREE.Group>,
            }))}
          />

          {/* Players */}
          {players}
          {boosters}
          {explosions}
          {/* Camera */}
          <FollowCamera targetRef={aircraftRef} />
        </Suspense>
      </Canvas>
    </main>
  );
}
