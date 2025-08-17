'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Bot from '@/Components/Player/Bot';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import HUD from '@/Components/UI/HUD/HUD';
import { onShipCollision } from '@/Utils/collisions';
import { getStartPoseFromCurve } from '@/Utils';
import { tracks } from '@/Lib/flightPath';
import { curveType } from '@/Constants';
import { Skybox } from '@/Components/Skybox/Skybox';
import MiniMap from '@/Components/UI/MiniMap/MiniMap';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useRaceProgress } from '@/Controllers/Game/RaceProgressController';
import { StandingsUI } from '@/Components/UI/Standings/StandingsUI';
import { RaceOver } from '@/Components/UI/RaceOver';
import { Speedometer } from '@/Components/UI/Speedometer/Speedometer';
import Link from 'next/link';
import { StartCountdown } from '@/Controllers/Game/StartTimer';
import Planet from '@/Components/World/Planet';
import SpeedPadSpawner from '@/Components/SpeedPad/speedPadSpawner';
import WeaponsPadSpawner from '@/Components/WeaponPad/WeaponPadSpawner';
import { useShipCollisions } from '@/Controllers/Collision/useShipCollisions';
import { ParticleSystem } from '@/Components/ParticleSystem/ParticleSystem';
// import Satellite from '@/Components/World/Satellite';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
import Satellite from '@/Components/World/Satellite';
import ShieldPadSpawner from '@/Components/ShieldPad/ShieldPadSpawner';
import { Mine } from '@/Components/Weapons/useMines';
import MinePadSpawner from '@/Components/MinePad/MinePadSpawner';
import TouchControls from '@/Components/UI/TouchControls/TouchController';
import { ControlButtons } from '@/Components/UI/TouchControls/ControlButtons';
// import { Trail } from 'node_modules/@react-three/drei';

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

export default function Stage1() {
  const aircraftRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const minePoolRef = useRef<Mine[]>([]);
  const planetRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const botRef1 = useRef<THREE.Group | null>(null);
  const botRef2 = useRef<THREE.Group | null>(null);
  const botRef3 = useRef<THREE.Group | null>(null);
  const botRef4 = useRef<THREE.Group | null>(null);
  const botRef5 = useRef<THREE.Group | null>(null);
  const botRef6 = useRef<THREE.Group | null>(null);
  const botRef7 = useRef<THREE.Group | null>(null);
  const thrusterOffset = new THREE.Vector3(0, 0.31, 1.6);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { loader, setMaterialLoaded } = useCanvasLoader();

  const playerRefs = useMemo(
    () => [aircraftRef, botRef1, botRef2, botRef3, botRef4, botRef5, botRef6, botRef7],
    [],
  );

  const bounds = { x: 500, y: 250, z: 500 };
  const {
    raceData,
    reset,
    track: curve,
    setTrack,
    setRaceComplete,
  } = useGameStore((state) => state);
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
    setMaterialLoaded(true);
    setTrack(tracks[1]);
    reset();
    return () => {
      setMaterialLoaded(false);
      setRaceComplete(false);
    };
  }, [reset, setMaterialLoaded, setRaceComplete, setTrack]);

  const players = playerRefs.map((player, id) =>
    id === 0 ? (
      <Aircraft
        key={id}
        trackId={1}
        id={id}
        minePoolRef={minePoolRef}
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
      key={id}
      duration={Infinity}
      direction={new THREE.Vector3(0, 0, 1)}
      target={player as React.RefObject<THREE.Object3D>}
      size={400}
      texturePath="/textures/explosion.png"
      offset={thrusterOffset}
      // useWorldSpace
      // emissions={{
      //   rateOverDistance: 100
      // }}
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
      <HUD playerRefs={playerRefs} trackId={1} />
      <MiniMap positions={positions} curve={curve} />
      <StandingsUI />
      <RaceOver />
      <Speedometer speed={speed} />
      <StartCountdown />
      <TouchControls />
      <ControlButtons />
      {loader}
      {/* Scene */}
      <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
        <Suspense fallback={null}>
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
          <Skybox stageName="stageF" />
          <Track
            ref={playingFieldRef}
            aircraftRef={aircraftRef as React.RefObject<THREE.Group>}
            curve={curve}
          />

          <Planet
            ref={sunRef as React.RefObject<THREE.Mesh>}
            position={new THREE.Vector3(500, 150, 500)}
            size={300}
            texturePath="sunsurface"
            clouds={false}
            emissive
            emissiveColor="white"
            emissiveIntensity={1}
          />
          <Satellite
            planetRef={sunRef as React.RefObject<THREE.Mesh>}
            orbitRadius={400}
            orbitSpeed={0.3}
            tilt={0}
          >
            <Planet ref={planetRef as React.RefObject<THREE.Mesh>} clouds={false} size={40} />
            <Satellite
              planetRef={planetRef as React.RefObject<THREE.Mesh>}
              orbitRadius={50}
              orbitSpeed={0.8}
              tilt={Math.PI / 2}
            >
              <Planet emissive color={'green'} size={3} clouds={false} />
            </Satellite>
          </Satellite>

          <MinePadSpawner
            curve={curve}
            padCount={4}
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
            padCount={4}
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

          {/* Camera */}
          <FollowCamera targetRef={aircraftRef} />
        </Suspense>
      </Canvas>
    </main>
  );
}
