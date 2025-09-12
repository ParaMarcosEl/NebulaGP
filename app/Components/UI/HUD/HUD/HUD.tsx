import { useRaceStandings } from '@/Controllers/Game/useRaceStandings';
import { useGameStore } from '@/Controllers/Game/GameController';
import { formatTime } from '@/Utils';
import { useEffect, useRef } from 'react';
import { TOTAL_LAPS } from '@/Constants';
import * as THREE from 'three';
import { useUserStore } from '@/Controllers/Users/useUserStore';
import cx from 'classnames';
import './HUD.css';

export default function HUD({
  trackId,
  playerRefs,
}: {
  trackId: number;
  playerRefs: React.RefObject<THREE.Object3D | null>[];
}) {
  const { raceData, playerId } = useGameStore((state) => {
    return state;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allGhostsRef = useRef<any>({});

  useEffect(() => {
    allGhostsRef.current = JSON.parse(localStorage?.getItem('ghosts') ?? '{}');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bestTime = allGhostsRef?.current?.[`${trackId}`] || 0;
  const { progressList, finished, raceOver } = useRaceStandings();
  const { user } = useUserStore();
  const playerData = raceData[playerId];

  const playerHistory = playerData?.history || [];
  const player =
    progressList.find(({ id }) => id === playerId) || finished.find(({ id }) => id === playerId);

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

  const standingsUI = progressList.length > 0 && (
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
      {/* <div>{JSON.stringify(Object.keys(raceData).map((racerId) => {
        const { lapTime, lapStartTime, totalTime, outOfBounds } = raceData[Number(racerId)];
        return {
          racerId,
          lapTime,
          lapStartTime,
          totalTime,
          outOfBounds,
        }
      }))}</div> */}
      {user && <div>Player: {user?.displayName}</div>}
      {raceOver ? (
        <>
          <div>🎉 RACE COMPLETED!</div>
          {bestTime?.time && <div>Best Time: {formatTime(bestTime.time)}</div>}
          <div>
            {'Total Time: '}
            {formatTime(raceData[playerId].totalTime)}
            {!!raceData[playerId].penaltyTime && (
              <span className="out"> +{formatTime(raceData[playerId].penaltyTime)}</span>
            )}
          </div>
          {history}
        </>
      ) : (
        <>
          {bestTime?.time && <div>Best Time: {formatTime(bestTime.time)}</div>}
          <div className={cx(playerData.outOfBounds && 'out')}>
            Current Time: {formatTime(playerData.totalTime)}
            {!!raceData[playerId].penaltyTime && (
              <span className="out"> +{formatTime(raceData[playerId].penaltyTime)}</span>
            )}
          </div>

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
