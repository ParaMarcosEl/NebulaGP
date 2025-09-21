import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/Controllers/Game/GameController';
import { formatTime } from '@/Utils';
import { useRaceStandings } from '@/Controllers/Game/useRaceStandings';
import './RaceOver.css';

export function RaceOver() {
  const { finished, raceOver } = useRaceStandings();
  const reset = useGameStore((s) => s.reset);
  const curve = useGameStore((s) => s.track);
  const setRacePosition = useGameStore((s) => s.setRacePosition);
  const playerId = useGameStore.getState().playerId;
  const player = finished.find(({ id }) => id === playerId);

  const [visible, setVisible] = useState(false);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    if (raceOver) {
      setTimeout(() => setVisible(true), 100);

      // After 5 seconds, move to side
      const timer = setTimeout(() => setDocked(true), 5100);
      return () => clearTimeout(timer);
    }
  }, [raceOver]);

  if (!raceOver) return null;

  const handleTryAgain = () => {
    reset();
    const startingPosition = curve.getPointAt(0);
    setRacePosition(playerId, startingPosition);
  };

  const history =
    (player?.history || []).length > 0 &&
    player?.history.map(({ time, lapNumber }, idx) => (
      <div key={idx}>
        lap {lapNumber}: {formatTime(time)}
      </div>
    ));

  return (
    <div className={`race-over ${visible ? 'visible' : ''} ${docked ? 'docked' : ''}`}>
      <h4>🏁 Race Over!</h4>
      <div>You placed: </div>
      <div className="placement">
        <span className="hash">#</span>
        {player?.place}
      </div>
      <div>Race Time: {formatTime(player?.time || 0)}</div>
      <div className="penalty">penalty: +{formatTime(player?.penaltyTime || 0)}</div>
      <hr />
      {history}
      <hr />
      <br />
      <div>
        <Link href={'/stage-select'} onClick={handleTryAgain}>
          Stage Select
        </Link>
      </div>
    </div>
  );
}
