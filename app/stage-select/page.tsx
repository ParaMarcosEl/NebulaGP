'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Skybox } from '@/Components/Skybox/Skybox';
import Planet from '@/Components/World/Planet';
import * as THREE from 'three';
import Satellite from '@/Components/World/Satellite';
import { Trail } from '@react-three/drei';
import { useCanvasLoader } from '@/Components/UI/Loader/CanvasLoader';
import { useGameStore } from '@/Controllers/Game/GameController';
import Modal from '@/Components/UI/Modal/Modal';
import Leaderboard from '@/Components/UI/Leaderboard/Leaderboard';
import NavBar from '@/Components/UI/Navigation/NavBar';
import './StageSelect.css';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';

export default function StageSelect() {
  const [leaderboard1, setLeaderboard1] = useState(false);
  const [leaderboard2, setLeaderboard2] = useState(false);
  const [leaderboard3, setLeaderboard3] = useState(false);

  const sunRef = useRef<THREE.Object3D>(null);
  const cometRef = useRef<THREE.Object3D>(null);
  const purpleRef = useRef<THREE.Object3D>(null);

  const { loader } = useCanvasLoader();
  const { setMaterialLoaded } = useGameStore((s) => s);

  useEffect(() => {
    setMaterialLoaded(true);
    usePlanetStore.getState().setPlanetReady(true);
    
    return () => {
      usePlanetStore.getState().setPlanetReady(false);
      setMaterialLoaded(false);
    };
  }, []);

  return (
    <>
      {loader}
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
      >
        <Skybox stageName="stageE" />
        <Suspense fallback={null}>
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

          <Planet
            clouds={false}
            texturePath="sunsurface"
            emissive
            color="white"
            emissiveColor="white"
            emissiveIntensity={2}
            size={30}
            ref={sunRef as React.RefObject<THREE.Object3D>}
            position={new THREE.Vector3(-60, 0, -250)}
          />

          <Satellite
            planetRef={sunRef as React.RefObject<THREE.Object3D>}
            orbitRadius={100}
            orbitSpeed={0.55}
            tilt={0.5}
          >
            <Planet color="lime" size={5} cloudRadius={0.5} />
          </Satellite>

          <Satellite
            planetRef={sunRef as React.RefObject<THREE.Object3D>}
            orbitRadius={150}
            orbitSpeed={0.5}
            tilt={0.2}
          >
            <Planet color="red" size={10} cloudRadius={0.5} />
          </Satellite>

          <Satellite
            planetRef={sunRef as React.RefObject<THREE.Object3D>}
            orbitRadius={250}
            orbitSpeed={0.1}
            tilt={0}
          >
            <Planet
              ref={purpleRef as React.RefObject<THREE.Object3D>}
              color="purple"
              size={10}
              clouds={false}
              emissive
              emissiveColor="brown"
              emissiveIntensity={0.1}
            />
            <Satellite
              planetRef={purpleRef as React.RefObject<THREE.Object3D>}
              orbitRadius={11}
              orbitSpeed={-1}
              tilt={0.3}
            >
              <Planet
                size={0.5}
                color="lightblue"
                clouds={false}
                emissive
                emissiveColor="lightblue"
                emissiveIntensity={3}
              />
            </Satellite>
            <Satellite
              planetRef={purpleRef as React.RefObject<THREE.Object3D>}
              orbitRadius={14}
              orbitSpeed={-1.5}
              tilt={-0.1}
            >
              <Planet
                size={0.66}
                color="orange"
                clouds={false}
                emissive
                emissiveColor="yellow"
                emissiveIntensity={3}
              />
            </Satellite>
          </Satellite>

          <Satellite
            planetRef={sunRef as React.RefObject<THREE.Object3D>}
            orbitRadius={300}
            orbitSpeed={-0.1}
            tilt={0.2}
          >
            <Planet
              ref={cometRef as React.RefObject<THREE.Object3D>}
              color="white"
              emissive
              emissiveColor="white"
              emissiveIntensity={3}
              size={3}
              clouds={false}
            />
            <Trail
              color={'white'}
              width={200}
              length={15}
              attenuation={(t) => t * t}
              target={cometRef as React.RefObject<THREE.Object3D>}
            />
          </Satellite>
        </Suspense>
      </Canvas>

      <main className="main">
        <NavBar />
        <h1 className="stage-select-heading">Select Stage</h1>

        <div>
          <div>
            <span>Stage 1</span>
            <Link href="/stages/stage1" className="stage-select-link">
              Race
            </Link>
            <Link href="/stages/stage1/time-trial" className="stage-select-link">
              Time Trial
            </Link>
            <button onClick={() => setLeaderboard1(true)}>Leaderboard</button>
          </div>

          <div>
            <span>Stage 2</span>
            <Link href="/stages/stage2" className="stage-select-link">
              Race
            </Link>
            <Link href="/stages/stage2/time-trial" className="stage-select-link">
              Time Trial
            </Link>
            <button onClick={() => setLeaderboard2(true)}>Leaderboard</button>
          </div>

          <div>
            <span>Stage 3</span>
            <Link href="/stages/stage3" className="stage-select-link">
              Race
            </Link>
            <Link href="/stages/stage3/time-trial" className="stage-select-link">
              Time Trial
            </Link>
            <button onClick={() => setLeaderboard3(true)}>Leaderboard</button>
          </div>
        </div>

        <Modal isOpen={leaderboard1} onClose={() => setLeaderboard1(false)}>
          <Leaderboard trackId="0" />
        </Modal>
        <Modal isOpen={leaderboard2} onClose={() => setLeaderboard2(false)}>
          <Leaderboard trackId="1" />
        </Modal>
        <Modal isOpen={leaderboard3} onClose={() => setLeaderboard3(false)}>
          <Leaderboard trackId="2" />
        </Modal>
      </main>
    </>
  );
}
