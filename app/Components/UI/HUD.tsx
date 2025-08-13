import { useRaceStandings } from '@/Controllers/Game/useRaceStandings';
import { useGameStore } from '@/Controllers/Game/GameController';
import { formatTime } from '@/Utils';
import { CSSProperties, useEffect, useRef } from 'react';
import { TOTAL_LAPS } from '@/Constants';
import * as THREE from 'three';

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

  const playerHistory = raceData[playerId]?.history || [];
  const player =
    inProgress.find(({ id }) => id === playerId) || finished.find(({ id }) => id === playerId);

  const history =
    playerHistory.length === 0 ? (
      <>
        <hr />
        <div>Lap History:</div>
        <div>No laps completed.</div>
      </>
    ) : (
      <>
        <hr />
        <div>Lap History:</div>
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
    <div style={hudStyle}>
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

const hudStyle: CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 20,
  padding: '10px 15px',
  background: 'rgba(0, 0, 0, 0)',
  color: 'white',
  fontFamily: 'monospace',
  fontSize: '14px',
  borderRadius: '8px',
  pointerEvents: 'none',
  zIndex: 10,
};
