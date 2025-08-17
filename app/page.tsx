'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import Aircraft from '@/Components/Player/Aircraft';
import Bot from '@/Components/Player/Bot';
import Track from '@/Components/Track/Track';
import FollowCamera from '@/Components/Camera/FollowCamera';
import { onShipCollision } from './Utils/collisions';
import { getStartPoseFromCurve } from '@/Utils';
import { tracks } from '@/Lib/flightPath';
import { curveType } from '@/Constants';
import { Skybox } from '@/Components/Skybox/Skybox';
import { useGameStore } from '@/Controllers/Game/GameController';
import { useRaceProgress } from '@/Controllers/Game/RaceProgressController';
import Link from 'next/link';
import { StartCountdown } from '@/Controllers/Game/StartTimer';
import { useFullscreen } from '@/Controllers/UI/useFullscreen';
import SpeedPadSpawner from '@/Components/SpeedPad/speedPadSpawner';
import WeaponsPadSpawner from '@/Components/WeaponPad/WeaponPadSpawner';
import Planet from '@/Components/World/Planet';
import { useShipCollisions } from '@/Controllers/Collision/useShipCollisions';
import { ParticleSystem } from '@/Components/ParticleSystem/ParticleSystem';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
import { Mine } from './Components/Weapons/useMines';
import ShieldPadSpawner from './Components/ShieldPad/ShieldPadSpawner';
import MinePadSpawner from './Components/MinePad/MinePadSpawner';
import './page.css';
import NavBar from './Components/UI/Navigation/NavBar';

function RaceProgressTracker({
  playerRefs,
}: {
  playerRefs: React.RefObject<THREE.Group>[];
  curve: curveType;
}) {
  useRaceProgress({ playerRefs });
  return null;
}

function ShipCollisionTracker({
  playerRefs,
  onCollide,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[];
  onCollide: (a: THREE.Object3D, b: THREE.Object3D) => void;
}) {
  useShipCollisions({ playerRefs, onCollide });
  return null;
}

export default function Home() {
  const aircraftRef = useRef<THREE.Group | null>(null);
  const playingFieldRef = useRef<THREE.Mesh | null>(null);
  const minePoolRef = useRef<Mine[]>([]);
  const botRef1 = useRef<THREE.Group | null>(null);
  const botRef2 = useRef<THREE.Group | null>(null);
  const botRef3 = useRef<THREE.Group | null>(null);
  const botRef4 = useRef<THREE.Group | null>(null);
  const botRef5 = useRef<THREE.Group | null>(null);
  const botRef6 = useRef<THREE.Group | null>(null);
  const botRef7 = useRef<THREE.Group | null>(null);
  const thrusterOffset = new THREE.Vector3(0, 0.31, 1.6);

  useFullscreen();

  const { loader, setMaterialLoaded } = useCanvasLoader();
  const playerRefs = useMemo(
    () => [aircraftRef, botRef1, botRef2, botRef3, botRef4, botRef5, botRef6, botRef7],
    [],
  );

  const { reset, track: curve, setTrack } = useGameStore((state) => state);
  const [, setSpeed] = useState(0);

  const startPositions = useMemo(
    () => playerRefs.map((ref, i) => getStartPoseFromCurve(curve, 0.01 + i * 0.01)),
    [curve, playerRefs],
  );

  useEffect(() => {
    setTrack(tracks[0]);
    setMaterialLoaded(true);
    reset();
    return () => {
      setMaterialLoaded(false);
    };
  }, []);

  const players = playerRefs.map((player, id) =>
    id === 0 ? (
      <Aircraft
        key={id}
        id={id}
        aircraftRef={player}
        playerRefs={playerRefs as React.RefObject<THREE.Group>[]}
        trackId={0}
        curve={curve}
        playingFieldRef={playingFieldRef}
        startPosition={startPositions[id].position}
        startQuaternion={startPositions[id].quaternion}
        acceleration={0.01}
        damping={0.99}
        onSpeedChange={setSpeed}
        botSpeed={1.6}
        minePoolRef={minePoolRef}
        isBot
      />
    ) : (
      <Bot
        key={id}
        id={id}
        aircraftRef={player}
        playerRefs={playerRefs as React.RefObject<THREE.Group>[]}
        curve={curve}
        playingFieldRef={playingFieldRef}
        startPosition={startPositions[id].position}
        startQuaternion={startPositions[id].quaternion}
        acceleration={0.01}
        damping={0.99}
        botSpeed={0.9 + id * 0.1}
        minePoolRef={minePoolRef}
        isBot
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

  return (
    <>
      <StartCountdown />
      {loader}
      <div className="canvas">
        <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
          <Suspense fallback={null}>
            <RaceProgressTracker
              playerRefs={playerRefs as React.RefObject<THREE.Group>[]}
              curve={curve}
            />
            <ShipCollisionTracker
              playerRefs={playerRefs as React.RefObject<THREE.Object3D>[]}
              onCollide={onShipCollision}
            />

            <ambientLight intensity={0.2} />
            <directionalLight position={[150, 0, 0]} intensity={0.8} castShadow />
            <pointLight position={[-10, 5, -10]} intensity={0.3} />

            <Skybox stageName="stageI" />
            <Track
              ref={playingFieldRef}
              aircraftRef={aircraftRef as React.RefObject<THREE.Object3D>}
              curve={curve}
            />

            <MinePadSpawner
              curve={curve}
              padCount={4}
              startT={0.3}
              playerRefs={(playerRefs as React.RefObject<THREE.Object3D>[]).map((ref, id) => ({
                id,
                ref,
              }))}
            />
            <SpeedPadSpawner
              curve={curve}
              padCount={16}
              startT={0.16}
              playerRefs={(playerRefs as React.RefObject<THREE.Object3D>[]).map((ref, id) => ({
                id,
                ref,
              }))}
            />
            <WeaponsPadSpawner
              curve={curve}
              padCount={4}
              startT={0.2}
              endT={0.9}
              playerRefs={(playerRefs as React.RefObject<THREE.Object3D>[]).map((ref, id) => ({
                id,
                ref,
              }))}
            />
            <ShieldPadSpawner
              curve={curve}
              padCount={2}
              startT={0.5}
              endT={0.8}
              playerRefs={(playerRefs as React.RefObject<THREE.Object3D>[]).map((ref, id) => ({
                id,
                ref,
              }))}
            />

            <Planet size={350} />

            {players}
            {boosters}

            <FollowCamera targetRef={aircraftRef} />
          </Suspense>
        </Canvas>
      </div>

      <main className="main">
        <NavBar />
        <div className="ui-container">
          <h1 className="heading">Zero-Gravity Racing</h1>

          <Link className="link" href="/stage-select">
            Play Game
          </Link>

          <section className="controls-section">
            <div className="subheading">🕹️ Keyboard Controls</div>

            <table className="control-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {keyboardControls.map(([keys, action], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'even-row' : ''}>
                    <td>
                      {(keys as string[]).map((key) => (
                        <kbd key={key}>{key}</kbd>
                      ))}
                    </td>
                    <td>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="subheading">🎮 Gamepad (PlayStation-style)</h3>
            <table className="control-table">
              <thead>
                <tr>
                  <th>Button</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {gamepadControls.map(([keys, action], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'even-row' : ''}>
                    <td>
                      {(keys as string[]).map((key) => (
                        <kbd key={key}>{key}</kbd>
                      ))}
                    </td>
                    <td>{action}</td>
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
