'use client';

import Head from 'next/head';
import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, createRef, useEffect } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/FollowCamera';
// import Obstacle from '@/Components/Obstacle';
import HUD from '@/Components/UI/HUD';
import { getStartPoseFromCurve, isMobileDevice } from '@/Utils';
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
import Satellite from '@/Components/World/Satellite';
import SpeedPadSpawner from '@/Components/SpeedPad/speedPadSpawner';

// import {ParticleSystem} from '@/Components/ParticleSystem';

function RaceProgressTracker({
  playerRef,
  botRefs,
  curve,
}: {
  playerRef: React.RefObject<THREE.Group>;
  botRefs: React.RefObject<THREE.Group>[];
  curve: curveType;
}) {
  useRaceProgress({ playerRef, playerRefs: botRefs, curve });
  return null; // No rendering, just logic
}

export default function Stage() {
  const aircraftRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const botRef = useRef<THREE.Group | null>(null);
  const botRef2 = useRef<THREE.Group | null>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  // const botRef3 = useRef<THREE.Group | null>(null);
  // const botRef4 = useRef<THREE.Group | null>(null);
  // const botRef5 = useRef<THREE.Group | null>(null);
  // const botRef6 = useRef<THREE.Group | null>(null);
  // const botRef7 = useRef<THREE.Group | null>(null);
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
    if (isMobileDevice() && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }

    setTrack(tracks[1]);
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
      }}
    >
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>
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
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
      >
        <RaceProgressTracker
          playerRef={aircraftRef as React.RefObject<THREE.Group>}
          botRefs={[
            botRef as React.RefObject<THREE.Group>,
            botRef2 as React.RefObject<THREE.Group>,
            // botRef3 as React.RefObject<THREE.Group>,
            // botRef4 as React.RefObject<THREE.Group>,
            // botRef5 as React.RefObject<THREE.Group>,
            // botRef6 as React.RefObject<THREE.Group>,
            // botRef7 as React.RefObject<THREE.Group>,
          ]}
          curve={curve}
        />
        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[150, 50, -500]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={500}
        />
        <pointLight position={[-10, 5, -10]} intensity={0.3} />

        {/* Postprocessing */}

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

        <SpeedPadSpawner
          curve={curve}
          playerRefs={[{ id: playerId, ref: aircraftRef as React.RefObject<THREE.Group> }]}
        />

        {/* <mesh position={new THREE.Vector3(-500, 0, -500)}>
          <sphereGeometry args={[100]}/>
          <meshStandardMaterial color="white" emissive='lighblue' emissiveIntensity={1} />
        </mesh> */}

        {/* <ParticleSystem 
          position={new THREE.Vector3(startPosition[0], startPosition[1] -100, startPosition[2] - 800)}
          particleCount={300} 
          size={100000} 
          maxDistance={300}
          speed={2}
          startColor="yellow"
          endColor="red"
          startOpacity={1}
          endOpacity={0}
        /> */}
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
        <Aircraft
          aircraftRef={botRef as React.RefObject<THREE.Group>}
          startPosition={startPosition}
          startQuaternion={startQuaternion}
          botSpeed={0.02}
          curve={curve}
          isBot
        />
        <Aircraft
          aircraftRef={botRef2 as React.RefObject<THREE.Group>}
          startPosition={startPosition}
          startQuaternion={startQuaternion}
          botSpeed={0.03}
          curve={curve}
          isBot
        />
        {/* <Aircraft 
          ref={botRef3 as React.RefObject<THREE.Group>} 
          startPosition={new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2])} 
          startQuaternion={startQuaternion} speed={.0003}
          curve={curve}
        />
        <Aircraft 
          ref={botRef4 as React.RefObject<THREE.Group>} 
          startPosition={new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2])} 
          startQuaternion={startQuaternion} speed={.00035}
          curve={curve}
        />
        <Aircraft 
          ref={botRef5 as React.RefObject<THREE.Group>} 
          startPosition={new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2])} 
          startQuaternion={startQuaternion} speed={.0004}
          curve={curve}
        />
        <Aircraft 
          ref={botRef6 as React.RefObject<THREE.Group>} 
          startPosition={new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2])} 
          startQuaternion={startQuaternion} speed={.00045}
          curve={curve}
        />
        <Aircraft 
          ref={botRef7 as React.RefObject<THREE.Group>} 
          startPosition={new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2])} 
          startQuaternion={startQuaternion} speed={.0005}
          curve={curve}
        /> */}

        {/* Camera */}
        <FollowCamera targetRef={aircraftRef} />
      </Canvas>
    </main>
  );
}
