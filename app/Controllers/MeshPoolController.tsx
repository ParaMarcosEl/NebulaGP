import { useRef, useCallback } from 'react';
import * as THREE from 'three';

interface PoolItem<T> {
  obj: T;
  active: boolean;
}

export function useMeshPool<T extends THREE.Object3D>(
  createFn: () => T,
  initialSize: number = 0
) {
  const poolRef = useRef<PoolItem<T>[]>([]);

  // Initialize pool
  if (poolRef.current.length === 0 && initialSize > 0) {
    for (let i = 0; i < initialSize; i++) {
      poolRef.current.push({ obj: createFn(), active: false });
    }
  }

  const get = useCallback((position?: THREE.Vector3): T => {
    let item = poolRef.current.find(i => !i.active);
    if (!item) {
      item = { obj: createFn(), active: true };
      poolRef.current.push(item);
    }

    item.active = true;
    if (position) item.obj.position.copy(position);
    item.obj.visible = true;
    return item.obj;
  }, [createFn]);

  const returnToPool = useCallback((obj: T) => {
    const item = poolRef.current.find(i => i.obj === obj);
    if (item) {
      item.active = false;
      obj.visible = false;
    }
  }, []);

  const getCount = useCallback(() => {
    return poolRef.current.filter(i => !i.active).length;
  }, []);

  const getAll = useCallback(() => poolRef.current.map(i => i.obj), []);

  return { get, returnToPool, getCount, getAll };
}
