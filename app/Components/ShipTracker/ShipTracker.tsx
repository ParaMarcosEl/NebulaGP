import { useShipCollisions } from "@/Controllers/Collision/useShipCollisions";
import { useBotsWorkerController } from "../Player/Bots/useBotsWorkerController";
import { useEffect, useMemo } from "react";
import { useRaceProgress } from "@/Controllers/Game/RaceProgressController";
import { BotInit, curveType } from "@/Constants";
import * as THREE from 'three';
import { onShipCollisionWorker } from "@/Utils/collisions";

export 
function ShipTracker({
  playerRefs,
  startPositions,
  curve,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[];
  startPositions: {
    position: [number, number, number];
    quaternion: THREE.Quaternion;
}[];
  curve: curveType;
}) {
  useRaceProgress({ playerRefs: playerRefs as React.RefObject<THREE.Group>[] });

  const botRefToId = new Map<THREE.Object3D, number>();
  const botRefs = useMemo(() => playerRefs.slice(1), []);
  
    useEffect(() => {
        botRefs.forEach((ref, i) => {
            if (ref.current) botRefToId.set(ref.current, i + 1);
        });
    }, [])

  
  // stable botsInit for worker (also created once)
  const botsInit = useMemo<BotInit[]>(
    () =>
      botRefs.map((_, idx) => ({
        id: idx + 1,
        speed: 80,
        currentT: 0,
        waypointIndex: 8,
        cannonValue: 1,
        useMine: false,
        position: startPositions[idx + 1].position,
        quaternion: [
          startPositions[idx + 1].quaternion.x, 
          startPositions[idx + 1].quaternion.y, 
          startPositions[idx + 1].quaternion.z, 
          startPositions[idx + 1].quaternion.w
        ],
      })),
    [] 
  );
  
    // Handlers invoked when worker requests actions:
    const handleBotFire = (botId: number) => {
      // find matching Bot component ref and call its fire method via projectiles hook or route into your weapon system
      // e.g., use a central projectile manager or call into a per-bot weapon hook mapping
      console.debug('bot fire', botId);
      // implement actual fire logic (projectile spawn) here
    };
  
    const handleBotDropMine = (botId: number) => {
      console.debug('bot dropMine', botId);
      // implement drop mine using minePoolRef
    };
    
    // attach the global worker controller
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { triggerImpulseFromMain } = useBotsWorkerController({
      botsInit,
      botRefs: botRefs as React.RefObject<THREE.Group>[],
      curve,
      // startPositions,
      onBotFire: handleBotFire,
      onBotDropMine: handleBotDropMine,
    });
    
    useShipCollisions({
        playerRefs,
        onCollide: (a, b) => {
            onShipCollisionWorker(a, b, triggerImpulseFromMain, botRefToId);
        },
    });
    
    return null;
}