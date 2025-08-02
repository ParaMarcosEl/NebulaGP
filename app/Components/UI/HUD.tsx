import { useRaceStandings } from '@/Controllers/useRaceStandings';
import { useGameStore } from '@/Controllers/GameController';
import { formatTime } from '@/Utils';
import { CSSProperties } from 'react';
import { TOTAL_LAPS } from '@/Constants';

export default function HUD() {
  const { lapTime, totalTime, raceData, playerId } = useGameStore((state) => {
    return state;
  });

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
      <div>{player?.place}</div>
      <div>
        {inProgress.map((player, idx) => (
          <div key={idx}>
            {player.id === playerId ? 'You' : `Bot${player.id}`}:#{player.place}
          </div>
        ))}
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
          <div>
            Current Lap: {(raceData[playerId]?.history?.length || 0) + 1}/{TOTAL_LAPS}
          </div>
          <div>Current Time: {formatTime(lapTime)}</div>
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
