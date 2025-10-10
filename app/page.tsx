'use client';

import Link from 'next/link';
import { useFullscreen } from '@/Controllers/UI/useFullscreen';
import './page.css';
import * as THREE from 'three';
import { useCanvasLoader } from './Components/UI/Loader/CanvasLoader';
import NavBar from './Components/UI/Navigation/NavBar';
import AuthForm from './Components/UI/Auth/AuthForm';
import AuthGuard from './Components/UI/Auth/AuthGaurd';
import { useUserStore } from './Controllers/Users/useUserStore';
import { Canvas } from '@react-three/fiber';
import { Skybox } from './Components/Skybox/Skybox';
import { Suspense, useEffect, useRef, useState } from 'react';
import Planet from './Components/World/Planet';
import { useGameStore } from './Controllers/Game/GameController';
import { usePlanetStore } from './Controllers/Game/usePlanetStore';
import Modal from './Components/UI/Modal/Modal';
import Leaderboard from './Components/UI/Leaderboard/Leaderboard';
import { Dashboard } from './Components/UI/Dashboard/Dashboard';
import ScrollCamera from './Components/Camera/ScrollCamera';

export default function Home() {

  useFullscreen();
    const [leaderboard1, setLeaderboard1] = useState(false);
    const [leaderboard2, setLeaderboard2] = useState(false);
    const [leaderboard3, setLeaderboard3] = useState(false);

    const uiContainerRef = useRef<HTMLDivElement>(null);
    const stageSelectRef = useRef<HTMLElement>(null);
    const dashboardRef = useRef<HTMLElement>(null);
  
    const sunRef = useRef<THREE.Object3D>(null);
    const graniteRef = useRef<THREE.Object3D>(null);
    const rubyRef = useRef<THREE.Object3D>(null);
  
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

  const { user } = useUserStore(s => s);

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
            className='canval'
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
                position={new THREE.Vector3(-60, -60, -250)}
              />
              <Planet
                clouds={false}
                texturePath="granite_ground128"
                emissive
                color="white"
                emissiveColor="white"
                emissiveIntensity={2}
                size={30}
                ref={graniteRef as React.RefObject<THREE.Object3D>}
                position={new THREE.Vector3(80, 0, -100)}
              />
              <Planet
                clouds={false}
                texturePath="ruby_ground128"
                emissive
                color="white"
                emissiveColor="white"
                emissiveIntensity={2}
                size={30}
                ref={rubyRef as React.RefObject<THREE.Object3D>}
                position={new THREE.Vector3(-20, 0, 150)}
              />
              <ScrollCamera
                uiContainerRef={uiContainerRef as React.RefObject<HTMLDivElement>}
                dashboardRef={dashboardRef as React.RefObject<HTMLDivElement>}
                stageSelectRef={stageSelectRef as React.RefObject<HTMLDivElement>}
                planetRefs={{
                  sun: sunRef as React.RefObject<THREE.Object3D>,
                  granite: graniteRef as React.RefObject<THREE.Object3D>,
                  ruby: rubyRef as React.RefObject<THREE.Object3D>,
                }}
              />

            </Suspense>
          </Canvas>
    

      <main className="main">
        <NavBar />
        <div ref={uiContainerRef} className="ui-container">
          <section ref={dashboardRef} className='section'>
            <h1 className="heading">Zero-Gravity Racing</h1>

            <button className="link play" onClick={() => {
              console.log( stageSelectRef?.current?.offsetTop, window.innerHeight);
              if (stageSelectRef.current && uiContainerRef.current)
              // uiContainerRef.current.scrollTo(0, stageSelectRef.current.offsetTop);
              uiContainerRef.current.scrollTo({ top: stageSelectRef.current.offsetTop,behavior: 'smooth' });
            }}>
              Play Game
            </button>

            <AuthGuard fallback={<AuthForm mode='login'/>} >
              {user?.email && <Dashboard />}
            </AuthGuard>
          </section>  

          <section ref={stageSelectRef} className='section'>
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
          </section>
          
          <Modal isOpen={leaderboard1} onClose={() => setLeaderboard1(false)}>
            <Leaderboard trackId="0" />
          </Modal>
          <Modal isOpen={leaderboard2} onClose={() => setLeaderboard2(false)}>
            <Leaderboard trackId="1" />
          </Modal>
          <Modal isOpen={leaderboard3} onClose={() => setLeaderboard3(false)}>
            <Leaderboard trackId="2" />
          </Modal>
        </div>           
      </main>
    </>
  );
}
