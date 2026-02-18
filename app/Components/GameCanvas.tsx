'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/Game/GameController';
import { usePlanetStore } from '@/Controllers/Game/usePlanetStore';
import { Skybox } from '@/Components/Skybox/Skybox';
import Planet from '@/Components/World/Planet';
import Satellite from '@/Components/World/Satellite';
import Stars from '@/Components/World/Stars';
import ScrollCamera from '@/Components/Camera/ScrollCamera';

type GameCanvasProps = {
  uiContainerRef: React.RefObject<HTMLDivElement>;
  dashboardRef: React.RefObject<HTMLDivElement>;
  stageSelectRef: React.RefObject<HTMLDivElement>;
};

const supportsWebGL = () => {
  if (typeof window === 'undefined') return true;

  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
};

export default function GameCanvas({ uiContainerRef, dashboardRef, stageSelectRef }: GameCanvasProps) {
  const sunRef = useRef<THREE.Object3D>(null);
  const graniteRef = useRef<THREE.Object3D>(null);
  const rubyRef = useRef<THREE.Object3D>(null);

  const [webglSupported, setWebglSupported] = useState(true);
  const { setMaterialLoaded } = useGameStore((s) => s);

  useEffect(() => {
    setWebglSupported(supportsWebGL());
  }, []);

  useEffect(() => {
    setMaterialLoaded(true);
    usePlanetStore.getState().setPlanetReady(true);

    return () => {
      usePlanetStore.getState().setPlanetReady(false);
      setMaterialLoaded(false);
    };
  }, [setMaterialLoaded]);

  const canvasStyle = useMemo(
    () => ({
      position: 'fixed' as const,
      top: 0,
      left: 0,
      zIndex: -1,
      width: '100%',
      height: '100%',
    }),
    [],
  );

  if (!webglSupported) {
    return <div className="canvas-fallback">WebGL is unavailable on this device.</div>;
  }

  return (
    <Canvas style={canvasStyle} className="canval" camera={{ position: [0, 5, 15], fov: 60 }}>
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
        <Stars radius={500} count={3000} texturePath="/textures/particleDot512.png" />
        <Planet
          clouds={false}
          texturePath="molten_rock128"
          emissive
          color="white"
          emissiveColor="white"
          emissiveIntensity={2}
          size={40}
          ref={sunRef as React.RefObject<THREE.Object3D>}
          position={new THREE.Vector3(-120, -120, -500)}
        />

        <Satellite
          planetRef={sunRef as React.RefObject<THREE.Object3D>}
          orbitRadius={100}
          orbitSpeed={0.55}
          tilt={0.5}
        >
          <Planet color="lime" size={5} cloudRadius={0.5} />
        </Satellite>
        <Planet
          clouds={false}
          texturePath="ruby_ground128"
          emissive
          color="white"
          emissiveColor="white"
          emissiveIntensity={2}
          size={30}
          ref={graniteRef as React.RefObject<THREE.Object3D>}
          position={new THREE.Vector3(160, 0, -200)}
        />

        <Satellite
          planetRef={graniteRef as React.RefObject<THREE.Object3D>}
          orbitRadius={60}
          orbitSpeed={0.287}
          tilt={1}
        >
          <Planet texturePath="granite_ground128" size={1} clouds={false} />
        </Satellite>

        <Satellite
          planetRef={graniteRef as React.RefObject<THREE.Object3D>}
          orbitRadius={40}
          orbitSpeed={0.431}
          tilt={5}
        >
          <Planet texturePath="granite_ground128" size={1} clouds={false} />
        </Satellite>
        <Planet
          clouds={false}
          texturePath="rocky_ground128"
          emissive
          color="white"
          emissiveColor="white"
          emissiveIntensity={2}
          size={30}
          ref={rubyRef as React.RefObject<THREE.Object3D>}
          position={new THREE.Vector3(-20, 0, 300)}
        />
        <ScrollCamera
          uiContainerRef={uiContainerRef}
          dashboardRef={dashboardRef}
          stageSelectRef={stageSelectRef}
          planetRefs={{
            sun: sunRef as React.RefObject<THREE.Object3D>,
            granite: graniteRef as React.RefObject<THREE.Object3D>,
            ruby: rubyRef as React.RefObject<THREE.Object3D>,
          }}
        />
      </Suspense>
    </Canvas>
  );
}
