'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Track from '@/Components/Track';
import FollowCamera from '@/Components/FollowCamera';
// import Obstacle from '@/Components/Obstacle';
import HUD from '@/Components/UI/HUD';
import { getStartPoseFromCurve } from '@/Utils';
import { tracks } from '@/Lib/flightPath';
import { curveType } from '@/Constants';
import { Skybox } from '@/Components/Skybox';
import BotCraft from '@/Components/Bot/BotCraft';
import MiniMap from '@/Components/UI/MiniMap/MiniMap';
import { useGameStore } from '@/Controllers/GameController';
import { useRaceProgress } from '@/Controllers/RaceProgressController';
import { StandingsUI } from '@/Components/UI/StandingsUI';
import { RaceOver } from '@/Components/UI/RaceOver';
import { Speedometer } from '@/Components/UI/Speedometer/Speedometer';
import { StartCountdown } from '@/Controllers/StartTimer';
import Link from 'next/link';
// import Planet from '@/Components/Planet';
import SpeedPadSpawner from '@/Components/speedPadSpawner';
import TerrainChunkManager from '@/Components/LODTerrain/TerrainChunkManager';

function RaceProgressTracker({
  playerRef,
  botRefs,
  curve,
}: {
  playerRef: React.RefObject<THREE.Object3D>;
  botRefs: React.RefObject<THREE.Object3D>[];
  curve: curveType;
}) {
  useRaceProgress({ playerRef, playerRefs: botRefs, curve });
  return null; // No rendering, just logic
}

export default function Stage() {
  const aircraftRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const botRef = useRef<THREE.Object3D | null>(null);
  const botRef2 = useRef<THREE.Object3D | null>(null);
  const bounds = { x: 500, y: 250, z: 500 };
  const { raceData, reset, track: curve, setTrack, playerId } = useGameStore((state) => state);
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
  const { position: startPosition, quaternion: startQuaternion } = useMemo(
    () => getStartPoseFromCurve(curve, 0.01),
    [curve],
  );

  useEffect(() => {
    setTrack(tracks[2]);
    reset();
  }, [reset, setTrack]);

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
      }}>

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

      {/* Scene */}
      <Canvas shadows camera={{ position: [0, 5, 15], fov: 60 }}>
        <RaceProgressTracker
          playerRef={aircraftRef as React.RefObject<THREE.Object3D>}
          botRefs={[
            botRef as React.RefObject<THREE.Object3D>,
            botRef2 as React.RefObject<THREE.Object3D>,
          ]}
          curve={curve}
        />
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[150, 10, 7]}
          intensity={3}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={500}
          shadow-radius={4}
        />
        <pointLight position={[-10, 5, -10]} intensity={0.0} />

        {/* World */}
        <Skybox stageName="stageD" />
        <Track
          ref={playingFieldRef}
          aircraftRef={aircraftRef as React.RefObject<THREE.Object3D>}
          curve={curve}
        />
        <TerrainChunkManager
          yOffset={-250}
          chunkSize={512}
          maxHeight={512}
          lacunarity={5}
          octaves={4}
          persistence={.2}
          lowMapPath='/textures/planet_texture01.png'
          highMapPath='/textures/planet_texture01.png'
          midMapPath='/textures/planet_texture02.png'
        />

        <SpeedPadSpawner
          curve={curve}
          playerRefs={[{ id: playerId, ref: aircraftRef as React.RefObject<THREE.Object3D> }]}
        />
        {/* {obstaclePositions.map((pos, i) => (
          <Obstacle key={i} position={pos} ref={obstacleRefs.current[i]} />
        ))} */}

        {/* Aircraft */}
        <Aircraft
          curve={curve}
          aircraftRef={aircraftRef}
          obstacleRefs={obstacleRefs.current}
          playingFieldRef={playingFieldRef}
          startPosition={startPosition}
          startQuaternion={startQuaternion}
          acceleration={0.01}
          damping={0.99}
          onSpeedChange={setSpeed}
        />

        {/* Bots */}
        <BotCraft
          ref={botRef as React.RefObject<THREE.Object3D>}
          startPosition={new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2])}
          startQuaternion={startQuaternion}
          speed={0.0005}
          curve={curve}
        />
        <BotCraft
          ref={botRef2 as React.RefObject<THREE.Object3D>}
          startPosition={new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2])}
          startQuaternion={startQuaternion}
          speed={0.00047}
          curve={curve}
        />

        {/* Camera */}
        <FollowCamera targetRef={aircraftRef} />
      </Canvas>
    </main>
  );
}
