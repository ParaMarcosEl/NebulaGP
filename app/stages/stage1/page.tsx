'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect, Suspense } from 'react';
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
import Planet from '@/Components/World/Planet/WorldPlanet';
import { HUDUI } from '@/Components/UI/HUD/HUDUI';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';
import ExplosionParticles, { ExplosionHandle } from '@/Components/Particles/ExplosionParticles/ExplosionParticles';
import { InitAudio } from '@/Components/Audio/InitAudio';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import { useRecords } from '@/Controllers/Records/useRecords';

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


export default function Stage1() {
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
  const { setPlanetMeshes } = usePlanetStore((s) => s);
  const { user } = useUserStore(s => s);
  const { fetchRecords, updateRecord, createRecord, records } = useRecords();
  const stageId = window.location.pathname;


  useEffect(() => {
    console.debug({records});
    if (records) return;
    fetchRecords(user?.id, stageId);
  }, [records])



  const playerRefs = useMemo(
    () => [aircraftRef, botRef1, botRef2, botRef3, botRef4, botRef5, botRef6, botRef7],
    [],
  );

  const explosionsRef = useRef<ExplosionHandle>(null);

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
    setTrack(tracks[0]);
    reset();
    return () => {
      setMaterialLoaded(false);
      setRaceComplete(false);
      setPlanetMeshes([]);
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
            intensity={0.5}
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
            playerRefs={playerRefs as React.RefObject<THREE.Object3D>[]}
            ref={playingFieldRef}
            curve={curve}
            spheres={[{ t: 0.4, radius: 100 }]}
            onRaceComplete={() => {
              console.log('onRaceComplete(): ', {user, records})
              if (!user || !records) return;
              // if user data found
              const userData = records.find((record) => record.userId === user?.id);
              if (userData) {
                if (! records) return;
                console.debug('userData found', {userData});
                const newBestTime = userData.totalTime < records[0].totalTime && userData.totalTime;
                if (newBestTime) {
                  console.debug('updating record for ', userData.name);
                  updateRecord(userData.id, {
                    ...userData,
                    totalTime: newBestTime,
                  })
                }
              } else {
                const playerData = raceData[0];
                console.debug('userData not found. Creating entry.')
                createRecord({
                  name: user.name || '', 
                  totalTime: 0, 
                  userId: '', 
                  trackId: '',
                  penalty: 0,
                  lapTimes: []
                })
                const playerTime = playerData.totalTime + playerData.penaltyTime;
                const newBestTime = playerTime < records[0].totalTime + records[0].penalty && playerTime;
                if (newBestTime) {
                  console.debug('New Best Time set!');
                }
              }
            }}
          />
          <MinePadSpawner
            curve={curve}
            padCount={5}
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
            position={new THREE.Vector3(0, 0, 0)}
            size={320}
            maxHeight={80}
            lacunarity={1.1}
            frequency={4}
            exponentiation={6}
          />
          {/* Players */}
          {players}
          {boosters}
          <ExplosionParticles ref={explosionsRef}/>
          {/* Camera */}
          <FollowCamera targetRef={aircraftRef} />
        </Suspense>
      </Canvas>
    </main>
  );
}
