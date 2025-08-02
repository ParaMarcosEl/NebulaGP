'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import FollowCamera from '@/Components/FollowCamera';
// import Obstacle from '@/Components/Obstacle';
import HUD from '@/Components/UI/HUD';
import { tracks } from '@/Lib/flightPath';
import { Skybox } from '@/Components/Skybox';
// import BotCraft from '@/Components/Bot/BotCraft';
import MiniMap from '@/Components/UI/MiniMap/MiniMap';
import { useGameStore } from '@/Controllers/GameController';
import { StandingsUI } from '@/Components/UI/StandingsUI';
import { RaceOver } from '@/Components/UI/RaceOver';
import { Speedometer } from '@/Components/UI/Speedometer/Speedometer';
import Link from 'next/link';
import { StartCountdown } from '@/Controllers/StartTimer';
// import Terrain from '@/Components/LODTerrain/worker/Terrain'
import TerrainChunkManager from '@/Components/LODTerrain/TerrainChunkManager';
import { CanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
// import { TestComlink } from '@/Components/LODTerrain/workers/comlinkTest';

// import Planet from '@/Components/Planet';

export default function Stage1() {
  const aircraftRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const { reset, track: curve, setTrack } = useGameStore((state) => state);

  useEffect(() => {
    setTrack(tracks[0]);
    reset();
  }, [reset, setTrack]);


  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      {/* UI */}
      {/* <TestComlink /> */}
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
      <MiniMap positions={[{ id: 1, isPlayer: true, v: new THREE.Vector3(0, 0, 0,)}]} curve={curve} />
      <StandingsUI />
      <RaceOver />
      <Speedometer speed={5} />
      <StartCountdown />
      
        <CanvasLoader />
      {/* Scene */}
      <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[50, 10, 7]}
            intensity={0.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={500}
            
            />

          {/* World */}
          <Skybox stageName="stageI" />
          <TerrainChunkManager 
            chunkSize={512}
            segments={128}
            frequency={.001}
            amplitude={1}
            exponentiation={3}
            maxHeight={800}
            octaves={8}
            yOffset={-150}
            lowMapPath='/textures/planet_texture01.png' 
            midMapPath='/textures/planet_texture02.png'
            highMapPath='/textures/planet_texture01.png'
          />
          {/* <Terrain 
            textureBlend={.5}
            worldOrigin={new THREE.Vector2(0, 0)}
            position={new THREE.Vector3(0,-150,0)}
            highMapPath='/textures/planet_texture01.png'
            lowMapPath='/textures/planet_texture01.png'
            midMapPath='/textures/planet_texture01.png'
            size={256} 
            segments={128}
            lacunarity={2.5}
            maxHeight={400}
            frequency={.0015}
            amplitude={1}
            octaves={6}
            persistence={.6}
            exponentiation={3}
            /> */}

          {/* Aircraft */}
          <Aircraft
            curve={curve}
            aircraftRef={aircraftRef}
            playingFieldRef={playingFieldRef}
            acceleration={0.01}
            damping={0.99}
            />

          {/* Camera */}
          <FollowCamera targetRef={aircraftRef} />
        </Suspense>
      </Canvas>
    </main>
  );
}
