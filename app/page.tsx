'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect, Suspense, CSSProperties } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Bot from '@/Components/Player/Bot';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import { getStartPoseFromCurve, onShipCollision } from '@/Utils';
import { tracks } from '@/Lib/flightPath';
import { curveType } from '@/Constants';
import { Skybox } from '@/Components/Skybox/Skybox';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useRaceProgress } from '@/Controllers/Game/RaceProgressController';
import Link from 'next/link';
import { StartCountdown } from '@/Controllers/Game/StartTimer';
import Planet from '@/Components/World/Planet';
import SpeedPadSpawner from '@/Components/SpeedPad/speedPadSpawner';
import WeaponsPadSpawner from '@/Components/WeaponPad/WeaponPadSpawner';
import { useShipCollisions } from '@/Controllers/Collision/useShipCollisions';
import { ParticleSystem } from '@/Components/ParticleSystem/ParticleSystem';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader'
import { blue } from '@/Constants/colors';


const styles = {
  main: {
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    touchAction: 'none',
    overscrollBehavior: 'none',
    WebkitOverflowScrolling: 'auto',
  } as CSSProperties,
  heading: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    color: blue,
  } as CSSProperties,
  paragraph: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    marginBottom: '2rem',
  } as CSSProperties,
  link: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: blue,
    color: '#000',
    textDecoration: 'none',
    fontWeight: 'bold',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
  } as CSSProperties,
  controlsSection: {
    marginTop: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  } as CSSProperties,
  subheading: {
    display: 'inline-block',
    background: 'rgba(0, 0, 0, .7)',
    fontSize: '20px',
    textAlign: 'center',
    color: blue,
    marginBottom: '1rem',
    borderRadius: '5px',
    minWidth: '200px',
    padding: '10px',
    alignSelf: 'center',
  } as CSSProperties,
  table: {
    width: '100%',
    maxWidth: '600px',
    margin: '1rem auto 2rem',
    borderCollapse: 'collapse',
    background: '#111a',
    border: '1px solid #0ff5',
    borderRadius: '8px',
    overflow: 'hidden',
    backdropFilter: 'blur(4px)',
  } as CSSProperties,
  th: {
    background: '#0ff3',
    color: blue,
    fontWeight: 'bold',
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #0ff5',
  } as CSSProperties,
  td: {
    padding: '12px 16px',
    textAlign: 'left',
    color: '#ddd',
  } as CSSProperties,
  evenRow: {
    backgroundColor: '#222a',
  } as CSSProperties,
  kbd: {
    background: '#222',
    border: '1px solid #555',
    padding: '3px 6px',
    borderRadius: '4px',
    marginRight: '4px',
    color: blue,
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  } as CSSProperties,
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

function ShipCollisionTracker({ playerRefs, onCollide } : {
    playerRefs: React.RefObject<THREE.Object3D>[],
    onCollide: (a: THREE.Object3D, b: THREE.Object3D) => void
}) {
  useShipCollisions({
    playerRefs,
    onCollide
  })
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
  const thrusterOffset = new THREE.Vector3(0, .31, 1.6);

  const { loader, setMaterialLoaded } = useCanvasLoader();

  const playerRefs = useMemo(() => [
    aircraftRef,
    botRef1,
    botRef2,
    botRef3,
    botRef4,
    botRef5,
    botRef6,
    botRef7
  ], []);

  const { reset, track: curve, setTrack } = useGameStore((state) => state);
  // HUD state
  const [,setSpeed] = useState(0);
  const startPositions = useMemo(
    () => playerRefs.map((ref, i) => getStartPoseFromCurve(curve, 0.01 + i * 0.01)),
    [curve, playerRefs],
  );

  useEffect(() => {
    setTrack(tracks[0]);
    setMaterialLoaded(true);
    reset();
  }, [reset, setMaterialLoaded, setTrack]);

  const players = playerRefs.map((player, id) => (
    id === 0 ?
    <Aircraft 
          key={id}
          aircraftRef={player}
          playerRefs={playerRefs}
          curve={curve}
          playingFieldRef={playingFieldRef}
          startPosition={startPositions[id].position}
          startQuaternion={startPositions[id].quaternion}
          acceleration={0.01}
          damping={0.99}
          onSpeedChange={setSpeed}
          botSpeed={1.6}
          isBot
    />
    :
    <Bot 
      key={id}
      aircraftRef={player}
      playerRefs={playerRefs}
      startPosition={startPositions[id].position}
      startQuaternion={startPositions[id].quaternion}
      curve={curve}
      isBot
      playingFieldRef={playingFieldRef}
      acceleration={0.01}
      damping={0.99}
      botSpeed={.9 + id * .1}
    />
  ));

  const boosters = playerRefs.map((player, id) =>(
    <ParticleSystem 
      key={id}
      target={player as React.RefObject<THREE.Object3D>}
      size={400}
      texturePath='/textures/explosion.png'
      offset={thrusterOffset}
      // useWorldSpace
      // emissions={{
      //   rateOverDistance: 100
      // }}
    />
  ));
  
const keyboardControls = [
  [['W', 'S'], 'Pitch Up / Down'],
  [['A', 'D'], 'Roll Left / Right'],
  [['I'], 'Accelerate'],
  [['K'], 'Brake'],
];

const gamepadControls = [
  [['X'], 'Accelerate'],
  [['☐'], 'Brake'],
  [['Left Stick'], 'Pitch / Roll'],
];
const UIStyles: CSSProperties = {
  position: 'absolute',
  width: '100%',
  top: '20px',
  left: '20px',
  background: 'rgba(0, 0, 0, 0)',
  zIndex: 100,
  overflow: 'hidden',
  overscrollBehavior: 'scroll',
}

  return (
    <>
    
      <StartCountdown />
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
      camera={{ position: [0, 5, 15], fov: 60 }}>
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
          <ambientLight intensity={0.2} />
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
            aircraftRef={aircraftRef as React.RefObject<THREE.Group>}
            curve={curve}
          />

          <SpeedPadSpawner
            curve={curve}
            playerRefs={
              playerRefs.map((ref, id) => ({
                id,
                ref: ref as React.RefObject<THREE.Group>
              }))
            }
          />

          <WeaponsPadSpawner 
            curve={curve}
            playerRefs={
              playerRefs.map((ref, id) => ({
                id,
                ref: ref as React.RefObject<THREE.Group>
              }))
            }
          />
          <Planet size={350} />

          {/* Players */}
          {players}
          {boosters}
          
          {/* Camera */}
          <FollowCamera targetRef={aircraftRef} />
        </Suspense>
      </Canvas>
    <main
      style={styles.main}
    >
      {/* UI */}
      <div style={UIStyles}>
        <h1 style={styles.heading}>NEBULA GP</h1>
        <p style={styles.paragraph}>Anti-gravity Racing</p>

        <Link style={styles.link} href="/stage-select">
          Start Game
        </Link>

        <section style={styles.controlsSection}>
          <div style={styles.subheading}>🕹️ Keyboard Controls</div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Key</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {keyboardControls.map(([keys, action], i) => (
                <tr key={i}>
                  <td style={styles.td}>
                    {(keys as string[]).map((key) => (
                      <kbd style={styles.kbd} key={key}>
                        {key}
                      </kbd>
                    ))}
                  </td>
                  <td style={styles.td}>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={styles.subheading}>🎮 Gamepad (PlayStation-style)</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Button</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {gamepadControls.map(([keys, action], i) => (
                <tr key={i}>
                  <td style={styles.td}>
                    {(keys as string[]).map((key) => (
                      <kbd style={styles.kbd} key={key}>
                        {key}
                      </kbd>
                    ))}
                  </td>
                  <td style={styles.td}>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
    </>
  );
}
