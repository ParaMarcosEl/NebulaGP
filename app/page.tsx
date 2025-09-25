'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect, Suspense, ReactElement, createRef } from 'react';
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
import Planet from '@/Components/World/Planet/WorldPlanet';
import { useShipCollisions } from '@/Controllers/Collision/useShipCollisions';
import ParticleSystem from '@/Components/Particles/ParticleSystem';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
import { Mine } from './Components/Weapons/useMines';
import ShieldPadSpawner from './Components/ShieldPad/ShieldPadSpawner';
import MinePadSpawner from './Components/MinePad/MinePadSpawner';
import './page.css';
import NavBar from './Components/UI/Navigation/NavBar';
import WeaponStatus from './Components/UI/WeaponStatus/WeaponStatus';
import MineExplosionParticles, {
  MineExplosionHandle,
} from './Components/Particles/ExplosionParticles';

import { useAudioBuffers } from '@/Controllers/Audio/useAudioBuffers';
import { useAudioListener } from '@/Controllers/Audio/AudioSystem';
import AuthForm from './Components/UI/Auth/AuthForm';
import AuthGuard from './Components/UI/Auth/AuthGaurd';
import { useUserStore } from './Controllers/Users/useUserStore';
import { ExplosionHandle } from './Components/Particles/ExplosionParticles/ExplosionParticles';

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

const EXPLOSION_POOL_SIZE = 10;

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
    const explosionsRef = useRef<ExplosionHandle>(null);

  useFullscreen();

  const { loader } = useCanvasLoader();
  const playerRefs = useMemo(
    () => [aircraftRef, botRef1, botRef2, botRef3, botRef4, botRef5, botRef6, botRef7],
    [],
  );

  const { user } = useUserStore(s => s);

  const { reset, track: curve, setTrack } = useGameStore((state) => state);
  const [, setSpeed] = useState(0);

  const startPositions = useMemo(
    () => playerRefs.map((ref, i) => getStartPoseFromCurve(curve, 0.01 + i * 0.01)),
    [curve, playerRefs],
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

  useEffect(() => {
    setTrack(tracks[0]);
    reset();
  }, []);
  
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
      startSize={30}
      endSize={3}
      target={player as React.RefObject<THREE.Object3D>}
      emissionRate={200}
    />
  ));

  const keyboardControls = [
    [['W', 'S'], 'Pitch Up / Down'],
    [['A', 'D'], 'Roll Left / Right'],
    [['I'], 'Accelerate'],
    [['K'], 'Brake'],
    [['J'], 'Use Item'],
  ];

  const gamepadControls = [
    [['X'], 'Accelerate'],
    [['☐'], 'Brake'],
    [['Left Stick'], 'Pitch / Roll'],
    [['R2'], 'Use Item'],
  ];

  return (
    <>
      <StartCountdown />
      {loader}
      <div className="canvas">
        <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
          <Suspense fallback={null}>
            <InitAudio />
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
              playerRefs={playerRefs as React.RefObject<THREE.Object3D>[]}
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

            <Planet
              position={new THREE.Vector3(0, -1300, 0)}
              size={1200}
              maxHeight={400}
              lacunarity={1.6}
              amplitude={0.2}
              octaves={4}
              frequency={7}
              exponentiation={6}
              lowTextPath='/textures/icy_ground128.png'
              midTextPath='/textures/rocky_ground128.png'
              highTextPath='/textures/molten_rock128.png'
            />

            {players}
            {boosters}
            {explosions}

            <FollowCamera targetRef={aircraftRef} />
          </Suspense>
        </Canvas>
      </div>

      <main className="main">
        <NavBar />
        <WeaponStatus />
        <div className="ui-container">
          <h1 className="heading">Zero-Gravity Racing</h1>

          <Link className="link" href="/stage-select">
            Play Game
          </Link>

          <AuthGuard fallback={<AuthForm mode='login'/>} >
            {user?.email && <span className='welcome'>{`Welcome ${user?.displayName}`}</span>}
          </AuthGuard>
          

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
