'use client';
import * as THREE from 'three';

export const followTarget = ({
    followerRef,
    targetRef,
    offset = new THREE.Vector3(0, 0, 0),
    followSpeed = 0.0,
    rotationSpeed = 0.0,
}: {
    followSpeed?: number;
    rotationSpeed?: number;
    followerRef: React.RefObject<THREE.Object3D>;
    targetRef: React.RefObject<THREE.Object3D>;
    offset?: THREE.Vector3;
}) => {
    const target = targetRef.current;
    const follower = followerRef.current;
    if (!target) return;

    const targetPos = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();

    target.getWorldPosition(targetPos);
    target.getWorldQuaternion(targetQuat);

    // Offset relative to ship orientation
    const worldOffset = offset.clone().applyQuaternion(targetQuat);
    const desiredPos = targetPos.clone().add(worldOffset);

    // Smooth position and orientation — keep full ship orientation (including roll)
    if (followSpeed) {
        follower.position.lerp(desiredPos, followSpeed);
    } else {
        follower.position.copy(desiredPos);
    }

    if (rotationSpeed) {
        follower.quaternion.slerp(targetQuat, rotationSpeed);
    } else {
        follower.quaternion.copy(targetQuat);
    }
  }