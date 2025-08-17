import { useGameStore } from '@/Controllers/Game/GameController';
import { formatTime } from '@/Utils';
import { useRaceStandings } from '@/Controllers/Game/useRaceStandings';
import './Standings.css';

export function StandingsUI() {
  const { finished } = useRaceStandings();

  return (
    finished.length > 0 && (
      <div className="standings">
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
