// Components/Camera/ScrollCamera.tsx
'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';

interface ScrollCameraProps {
  uiContainerRef: React.RefObject<HTMLDivElement>;
  dashboardRef: React.RefObject<HTMLElement>;
  stageSelectRef: React.RefObject<HTMLElement>;
  planetRefs: {
    sun: React.RefObject<THREE.Object3D>;
    granite: React.RefObject<THREE.Object3D>;
    ruby: React.RefObject<THREE.Object3D>;
  };
}

export default function ScrollCamera({
  uiContainerRef,
  dashboardRef,
  stageSelectRef,
  planetRefs,
}: ScrollCameraProps) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const smoothTarget = useRef(new THREE.Vector3());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const startTime = useRef<number | null>(null);

  // Smooth camera motion variables
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cameraTarget = useRef(new THREE.Vector3());
  const desiredPosition = useRef(new THREE.Vector3());
  const scrollProgress = useRef(0);

  useEffect(() => {
    const container = uiContainerRef.current;
    if (!container || !stageSelectRef.current || !dashboardRef.current) return;

    const handleScroll = () => {
      const maxScroll =
        container.scrollHeight - container.clientHeight;
      scrollProgress.current = container.scrollTop / maxScroll;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [uiContainerRef, stageSelectRef, dashboardRef]);

  useFrame((_, delta) => {
    // Determine current scroll-based camera target
    const ruby = planetRefs.ruby.current;
    const granite = planetRefs.granite.current;
    const sun = planetRefs.sun.current;

    if (!ruby || !granite || !sun) return;

    // Scroll progress (0 = top, 1 = bottom)
    const t = scrollProgress.current;

    // Phase 1: between Sun → Ruby (start transition)
    // Phase 2: between Ruby → Granite (as user scrolls)
    let fromPlanet: THREE.Object3D = ruby;
    let toPlanet: THREE.Object3D = granite;

    // Map scroll progress to transitions
    if (t < 0.3) {
      fromPlanet = sun;
      toPlanet = ruby;
    } else if (t >= 0.3 && t < 0.9) {
      fromPlanet = ruby;
      toPlanet = granite;
    } else {
      fromPlanet = granite;
      toPlanet = granite;
    }

    // Interpolate between planet positions
    desiredPosition.current.copy(fromPlanet.position).lerp(toPlanet.position, (t - (t < 0.3 ? 0 : 0.3)) / (t < 0.3 ? 0.3 : 0.6));

    // Offset camera backwards so it looks *at* the planet from a distance
    const offsetDir = new THREE.Vector3()
      .copy(desiredPosition.current)
      .normalize()
      .multiplyScalar(-100); // how far back camera sits

    const desiredCameraPos = desiredPosition.current.clone().add(offsetDir);

    // Smoothly interpolate camera position
    camera.position.lerp(desiredCameraPos, delta * 1.5);

    // Smoothly rotate camera to look at the planet
    target.current.copy(desiredPosition.current);
    smoothTarget.current.lerp(target.current, delta * 2);
    camera.lookAt(smoothTarget.current);
  });

  return null;
}
