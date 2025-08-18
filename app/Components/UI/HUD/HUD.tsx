import { useRaceStandings } from '@/Controllers/Game/useRaceStandings';
import { useGameStore } from '@/Controllers/Game/GameController';
import { formatTime } from '@/Utils';
import { useEffect, useRef } from 'react';
import { TOTAL_LAPS } from '@/Constants';
import * as THREE from 'three';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import './HUD.css';

export default function HUD({
  trackId,
  playerRefs,
}: {
  trackId: number;
  playerRefs: React.RefObject<THREE.Object3D | null>[];
}) {
  const { lapTime, totalTime, raceData, playerId } = useGameStore((state) => {
    return state;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allGhostsRef = useRef<any>({});

  useEffect(() => {
    allGhostsRef.current = JSON.parse(localStorage?.getItem('ghosts') ?? '{}');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bestTime = allGhostsRef?.current?.[`${trackId}`] || 0;
  const { inProgress, finished, raceOver } = useRaceStandings();
  const { user } = useUserStore();

  const playerHistory = raceData[playerId]?.history || [];
  const player =
    inProgress.find(({ id }) => id === playerId) || finished.find(({ id }) => id === playerId);

  const history =
    playerHistory.length === 0 ? (
      <>
        <hr />
        <div>No laps completed.</div>
      </>
    ) : (
      <>
        <hr />
        {playerHistory.map(
          (lap, idx) =>
            idx < TOTAL_LAPS && (
              <div key={lap.timestamp}>
                Lap {lap.lapNumber}: {formatTime(lap.time)}
              </div>
            ),
        )}
      </>
    );

  const standingsUI = inProgress.length > 0 && (
    <>
      <hr />
      <div>Place:</div>
      <div>
        <span style={{ fontSize: '2em' }}>{player?.place}</span>/{playerRefs.length}
      </div>
    </>
  );

  return (
    <div className="hud">
      {user && <div>Player: {user?.displayName}</div>}
      {raceOver ? (
        <>
          <div>🎉 RACE COMPLETED!</div>
          <div>Total Time: {formatTime(totalTime)}</div>
          {history}
        </>
      ) : (
        <>
          {bestTime?.time && <div>Best Time: {formatTime(bestTime.time)}</div>}
          <div>Current Time: {formatTime(lapTime)}</div>
          <div>
            Current Lap: {(raceData[playerId]?.history?.length || 0) + 1}/{TOTAL_LAPS}
          </div>
          {history}
        </>
      )}
      {standingsUI}
      <div></div>
    </div>
  );
}
