'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Bot from '@/Components/Player/Bot';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import HUD from '@/Components/UI/HUD';
import { getStartPoseFromCurve, onShipCollision } from '@/Utils';
import { tracks } from '@/Lib/flightPath';
import { curveType } from '@/Constants';
import { Skybox } from '@/Components/Skybox/Skybox';
import MiniMap from '@/Components/UI/MiniMap/MiniMap';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useRaceProgress } from '@/Controllers/Game/RaceProgressController';
import { StandingsUI } from '@/Components/UI/StandingsUI';
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
import TerrainChunkManager from '@/Components/LODTerrain/TerrainChunkManager';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
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
  const planetRef = useRef<THREE.Mesh>(null);
  const botRef1 = useRef<THREE.Group | null>(null);
  const botRef2 = useRef<THREE.Group | null>(null);
  const botRef3 = useRef<THREE.Group | null>(null);
  const botRef4 = useRef<THREE.Group | null>(null);
  const botRef5 = useRef<THREE.Group | null>(null);
  const botRef6 = useRef<THREE.Group | null>(null);
  const botRef7 = useRef<THREE.Group | null>(null);
  const thrusterOffset = new THREE.Vector3(0, 0.31, 1.6);
  const { loader } = useCanvasLoader();

  const playerRefs = useMemo(
    () => [aircraftRef, botRef1, botRef2, botRef3, botRef4, botRef5, botRef6, botRef7],
    [],
  );

  const bounds = { x: 500, y: 250, z: 500 };
  const { raceData, reset, track: curve, setTrack } = useGameStore((state) => state);
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
    reset();
  }, [reset, setTrack]);

  const players = playerRefs.map((player, id) =>
    id === 0 ? (
      <Aircraft
        key={id}
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
        botSpeed={1.2}
      />
    ),
  );

  const boosters = playerRefs.map((player, id) => (
    <ParticleSystem
      key={id}
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
      <HUD />
      <MiniMap positions={positions} curve={curve} />
      <StandingsUI />
      <RaceOver />
      <Speedometer speed={speed} />
      <StartCountdown />
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
          <Skybox stageName="stageD" />
          <Track
            ref={playingFieldRef}
            aircraftRef={aircraftRef as React.RefObject<THREE.Group>}
            curve={curve}
          />
          <TerrainChunkManager
            yOffset={-300}
            chunkSize={512}
            segments={128}
            frequency={0.001}
            amplitude={1}
            exponentiation={3}
            maxHeight={1024}
            octaves={8}
            lowMapPath="/textures/planet_texture01.png"
            highMapPath="/textures/planet_texture01.png"
            midMapPath="/textures/planet_texture02.png"
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
          <SpeedPadSpawner
            curve={curve}
            playerRefs={playerRefs.map((ref, id) => ({
              id,
              ref: ref as React.RefObject<THREE.Group>,
            }))}
          />

          <WeaponsPadSpawner
            curve={curve}
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
