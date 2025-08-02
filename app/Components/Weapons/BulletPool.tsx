// components/BulletPool.tsx
import React, { useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import Bullet from './Bullet';

type BulletPoolHandle = {
  spawnBullet: (position: THREE.Vector3, direction: THREE.Vector3, speed: number) => void;
};

type BulletData = {
  id: number;
  active: boolean;
  initialPosition: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
};

type BulletPoolProps = {
  poolSize?: number;
  bulletRadius?: number;
  bulletColor?: string;
  maxDistance?: number;
};

export const BulletPool = forwardRef<BulletPoolHandle, BulletPoolProps>(
  ({ poolSize = 50, bulletRadius = 0.1, bulletColor = 'hotpink', maxDistance = 1000 }, ref) => {
    const [bullets, setBullets] = useState<BulletData[]>(
      Array(poolSize)
        .fill(null)
        .map((_, i) => ({
          id: i,
          active: false,
          initialPosition: new THREE.Vector3(),
          direction: new THREE.Vector3(),
          speed: 0,
        }))
    );

    useImperativeHandle(ref, () => ({
      spawnBullet(position, direction, speed) {
        setBullets(prevBullets => {
          const index = prevBullets.findIndex(b => !b.active);
          if (index === -1) return prevBullets; // No free bullet

          const updated = [...prevBullets];
          updated[index] = {
            ...updated[index],
            active: true,
            initialPosition: position.clone(),
            direction: direction.clone(),
            speed,
          };
          return updated;
        });
      },
    }));

    const deactivateBullet = (id: number) => {
      setBullets(prev =>
        prev.map(b => (b.id === id ? { ...b, active: false } : b))
      );
    };

    return (
      <>
        {bullets.map(bullet =>
          bullet.active ? (
            <Bullet
              key={bullet.id}
              active={true}
              initialPosition={bullet.initialPosition}
              direction={bullet.direction}
              speed={bullet.speed}
              radius={bulletRadius}
              color={bulletColor}
              maxDistance={maxDistance}
              onDeactivate={() => deactivateBullet(bullet.id)}
            />
          ) : null
        )}
      </>
    );
  }
);

BulletPool.displayName = 'BulletPool';