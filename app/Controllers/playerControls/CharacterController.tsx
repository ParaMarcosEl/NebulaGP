import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { useGLTF, useKeyboardControls } from 'node_modules/@react-three/drei';
import { useControls } from 'leva';
import { MathUtils } from 'three';

import React, { useRef } from 'react';
import * as THREE from 'three';

export const CharacterController = ({ damping = 0.9 }) => {
  const RigidBodyRef = useRef<RapierRigidBody | null>(null);
  const containerRef = useRef<THREE.Group | null>(null);
  const cameraTargetRef = useRef<THREE.Group | null>(null);
  const cameraPositionRef = useRef<THREE.Group | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const SHIP_SCALE = 1;
  const { scene } = useGLTF('/models/spaceship.glb');
  // Define the starting position as [x, y, z]
  const startPosition: [number, number, number] = [0, 0, 0];
  const cameraWorldPosition = useRef(new THREE.Vector3());
  const lookAtWorldPosition = useRef(new THREE.Vector3());
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const rotationTargetRef = useRef(0);

  const [, get] = useKeyboardControls();

  const { SPEED, PITCH_ROTATION_SPEED } = useControls('Character Controls', {
    SPEED: { value: 20, min: 0, max: 100, step: 1 },
    PITCH_ROTATION_SPEED: {
      value: MathUtils.degToRad(0.5),
      min: MathUtils.degToRad(0.1),
      max: MathUtils.degToRad(20),
      step: MathUtils.degToRad(0.1),
    },
  });

  useFrame(({ camera }) => {
    if (
      !RigidBodyRef.current ||
      !containerRef.current ||
      !cameraTargetRef.current ||
      !cameraPositionRef.current
    )
      return;
    const velocity = RigidBodyRef.current.linvel();
    const movement = {
      x: 0,
      y: 0,
      z: 0,
    };

    if (get().forward) movement.z -= 1;
    if (get().backward) movement.z += 1;

    if (get().pitchDown) {
      movement.x += 1;
    }
    if (get().pitchUp) {
      movement.x -= 1;
    }

    if (movement.x !== 0) {
      rotationTargetRef.current += movement.x * PITCH_ROTATION_SPEED;
      velocity.x = Math.sin(rotationTargetRef.current) * SPEED;
    }

    if (movement.z !== 0) {
      velocity.z = Math.cos(rotationTargetRef.current) * SPEED;
    }
    RigidBodyRef.current.setLinvel(velocity, true);

    // Update Camera Position
    containerRef.current.rotation.x = THREE.MathUtils.lerp(
      containerRef.current.rotation.x,
      rotationTargetRef.current,
      0.1,
    );

    cameraPositionRef?.current?.getWorldPosition(cameraWorldPosition.current);
    camera.position.lerp(cameraWorldPosition.current, 0.1);

    if (cameraTargetRef.current) {
      cameraTargetRef.current.getWorldPosition(lookAtWorldPosition.current);
      lookAtRef.current.lerp(lookAtWorldPosition.current, 0.1);

      camera.lookAt(lookAtRef.current);
    }
  });

  return (
    <>
      <RigidBody
        ref={RigidBodyRef}
        position={startPosition}
        quaternion={new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0))}
        lockRotations={false}
        enabledRotations={[true, true, true]}
        restitution={1}
        friction={0}
        linearDamping={damping / 2}
        angularDamping={1}
        mass={20}
      >
        {/* Visual Mesh */}
        <group ref={containerRef} scale={SHIP_SCALE} rotation={[0, 0, 0]}>
          <group ref={cameraTargetRef} position-z={10} />
          <group ref={cameraPositionRef} position-y={4} position-z={-7} />
          <group ref={characterRef}>
            <primitive
              object={scene}
              scale={0.5}
              quaternion={new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0))}
            />
          </group>
        </group>

        {/* Capsule collider - adjust radius, height, rotation as needed */}
        <CapsuleCollider
          args={[0.8, 1]} // [radius, height], height excludes the hemispheres
          rotation={[Math.PI / 2, 0, 0]} // orient capsule along Z axis (assuming ship points forward on Z)
          position={[0, -0.3, 0]} // optional offset
        />
        <CuboidCollider
          args={[2.6, 0.2, 0.5]} // [width, height, depth]
          position={[0, -0.2, 0.9]} // optional offset
        />
      </RigidBody>
    </>
  );
};
