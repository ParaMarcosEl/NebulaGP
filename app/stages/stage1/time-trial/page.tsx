/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Bot from '@/Components/Player/Bot';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import HUD from '@/Components/UI/HUD';
import { onShipCollision } from '@/Utils/collisions';
import { getStartPoseFromCurve } from '@/Utils';
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
import ShieldPadSpawner from '@/Components/ShieldPad/ShieldPadSpawner';
import { Mine } from '@/Components/Weapons/useMines';
import { GhostShip } from '@/Components/Player/GhostRecorder/GhostShip';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';

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
  const ghostRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const minePoolRef = useRef<Mine[]>([]);
  const { loader } = useCanvasLoader();
  const thrusterOffset = new THREE.Vector3(0, 0.31, 1.6);

  const playerRefs = useMemo(
    () => [
      aircraftRef,
      ghostRef,
      // botRef1, botRef2, botRef3, botRef4, botRef5, botRef6, botRef7
    ],
    [],
  );

  const bounds = { x: 500, y: 250, z: 500 };

  const {
    raceData,
    reset,
    track: curve,
    setTrack,
    setMaterialLoaded,
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
    () => playerRefs.map((ref, i) => getStartPoseFromCurve(curve, 0.01)),
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
  }, []);

  const players = playerRefs.map((player, id) =>
    id === 0 ? (
      <Aircraft
        trackId={0}
        key={id}
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
        botSpeed={1.4}
      />
    ) : (
      <GhostShip key={id} shipRef={ghostRef as React.RefObject<THREE.Object3D>} trackId={0} />
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
      <HUD playerRefs={playerRefs} trackId={0} />
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
          <Skybox stageName="stageI" />

          <Track
            ref={playingFieldRef}
            aircraftRef={aircraftRef as React.RefObject<THREE.Group>}
            curve={curve}
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

          {/* <WeaponsPadSpawner
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
          /> */}
          <Planet size={350} />

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
