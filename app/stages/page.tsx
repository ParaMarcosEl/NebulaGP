'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect, Suspense, ReactElement } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Bot from '@/Components/Player/Bot';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import { getStartPoseFromCurve } from '@/Utils';
import { onShipCollision } from '@/Utils/collisions';
import { tracks } from '@/Lib/flightPath';
import { curveType } from '@/Constants';
import { Skybox } from '@/Components/Skybox/Skybox';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useRaceProgress } from '@/Controllers/Game/RaceProgressController';
import Link from 'next/link';
import SpeedPadSpawner from '@/Components/SpeedPad/speedPadSpawner';
import WeaponsPadSpawner from '@/Components/WeaponPad/WeaponPadSpawner';
import { useShipCollisions } from '@/Controllers/Collision/useShipCollisions';
import ShieldPadSpawner from '@/Components/ShieldPad/ShieldPadSpawner';
import MinePadSpawner from '@/Components/MinePad/MinePadSpawner';
import { Mine } from '@/Components/Weapons/useMines';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
import ParticleSystem from '@/Components/Particles/ParticleSystem';
import MineExplosionParticles, {
  MineExplosionHandle,
} from '@/Components/Particles/ExplosionParticles';
import Planet from '@/Components/World/Planet/WorldPlanet';

import { useAudioBuffers } from '@/Controllers/Audio/useAudioBuffers';
import { useAudioListener } from '@/Controllers/Audio/AudioSystem';
import { HUDUI } from '@/Components/UI/HUD/HUDUI';
import { ExplosionHandle } from '@/Components/Particles/ExplosionParticles/ExplosionParticles';

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
  return null;
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

export default function TestStage() {
  const aircraftRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const botRef1 = useRef<THREE.Group | null>(null);
  const botRef2 = useRef<THREE.Group | null>(null);
  const botRef3 = useRef<THREE.Group | null>(null);
  const botRef4 = useRef<THREE.Group | null>(null);
  const botRef5 = useRef<THREE.Group | null>(null);
  const botRef6 = useRef<THREE.Group | null>(null);
  const botRef7 = useRef<THREE.Group | null>(null);
  const minePoolRef = useRef<Mine[]>([]);
  const { loader } = useCanvasLoader();
    const explosionsRef = useRef<ExplosionHandle>(null);

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

  // Use useEffect to check that the refs are populated after the initial render.
  // This is a good way to debug timing issues.
  useEffect(() => {
    console.log('Explosion Pool Refs populated:', explosionPoolRef.current);
    if (explosionPoolRef.current.length === 0) {
      console.error('Explosion pool is empty!');
    }
  }, []); // Run only once after initial render

  const bounds = { x: 500, y: 250, z: 500 };
  const {
    raceData,
    reset,
    track: curve,
    setTrack,
    setMaterialLoaded,
    setRaceComplete,
    setTouchEnabled,
  } = useGameStore((state) => state);

  useEffect(() => {
    if ('ontouchstart' in window) {
      setTouchEnabled(true);
    }
    return () => {
      setTouchEnabled(false);
    };
  }, [setTouchEnabled]);

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

  const [speed, setSpeed] = useState(0);
  const startPositions = useMemo(
    () => playerRefs.map((ref, i) => getStartPoseFromCurve(curve, 0.01 + i * 0.01)),
    [curve, playerRefs],
  );

  useEffect(() => {
    setMaterialLoaded(true);
    setTrack(tracks[0]);
    reset();
    return () => {
      setMaterialLoaded(false);
      setRaceComplete(false);
    };
  }, [reset, setTrack, setMaterialLoaded, setRaceComplete]);
  
    const players = playerRefs.map((player, id) =>
      id === 0 ? (
        <Aircraft
          key={id}
          id={id}
          trackId={0}
          aircraftRef={player}
          playerRefs={playerRefs}
          minePoolRef={minePoolRef}
          // Correctly pass the typed ref object
          explosionsRef={explosionsRef as React.RefObject<ExplosionHandle>}
          curve={curve}
          obstacleRefs={obstacleRefs.current}
          playingFieldRef={playingFieldRef}
          startPosition={startPositions[id].position}
          startQuaternion={startPositions[id].quaternion}
          acceleration={0.001}
          damping={0.99}
          onSpeedChange={setSpeed}
          botSpeed={2.2}
        />
      ) : (
        <Bot
          key={id}
          minePoolRef={minePoolRef}
          explosionsRef={explosionsRef as React.RefObject<ExplosionHandle>}
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
          botSpeed={1.4 + id * 0.1}
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
      startSize={20}
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
        trackId={0}
        positions={positions}
        curve={curve}
        speed={speed}
      />
      {loader}
      {/* Scene */}
      <Canvas
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -1,
          width: '100%',
          height: '100%',
        }}
        camera={{ position: [0, 5, 15], fov: 60 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.sortObjects = true;
        }}
      >
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
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[150, 0, 0]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={500}
          />
          <pointLight position={[-10, 5, -10]} intensity={0.3} />
          {/* World */}
          <Skybox stageName="stageI" />
          <Track
            ref={playingFieldRef}
            playerRefs={playerRefs as React.RefObject<THREE.Object3D>[]}
            curve={curve}
          />
          <MinePadSpawner
            curve={curve}
            padCount={4}
            startT={0.1}
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
          <Planet 
            position={new THREE.Vector3()} 
            size={340} 
            maxHeight={40} 
            exponentiation={3} 
          />
          {/* Players */}
          {players}
          {boosters}
          {/* Explosions */}
          {explosions}
          {/* Camera */}
          <FollowCamera targetRef={aircraftRef} />
        </Suspense>
      </Canvas>
    </main>
  );
}
