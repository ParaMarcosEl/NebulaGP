import { useGameStore } from '@/Controllers/GameController';
import { formatTime } from '@/Utils';
import { useRaceStandings } from '@/Controllers/useRaceStandings';

export function StandingsUI() {
  const { finished } = useRaceStandings();

  return (
    finished.length > 0 && (
      <div
        style={{
          zIndex: 1,
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0,0,0,0)',
          padding: 10,
          color: 'white',
          fontFamily: 'monospace',
          textAlign: 'right',
        }}
      >
        <h4>🏁 Standings</h4>
        <ol>
          {finished.map(({ id, time, place }, i) => (
            <li key={i}>
              {id === useGameStore.getState().playerId ? 'You' : `Bot${id}`} — Placed #{place}{' '}
              {formatTime(time)}
            </li>
          ))}
        </ol>
      </div>
    )
  );
}
