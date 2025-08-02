import { CSSProperties } from 'react';
import SpeedMeter from './SpeedMeter';
import TouchControls from '../TouchController';
// import { useGameStore } from '@/Controllers/GameController';
// import { useRaceStandings } from '@/Controllers/useRaceStandings';

export const Speedometer = function ({ speed }: { speed: number }) {
  // const { playerId, raceData } = useGameStore(s => s);

  // const { finished, inProgress } = useRaceStandings();

  const speedometerStyle: CSSProperties = {
    zIndex: 1,
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: '50%',
    background: '#000a',
    padding: '20px',
    color: 'white',
    fontFamily: 'monospace',
    textAlign: 'right',
    borderRadius: '8px',
    transition: 'opacity 1s ease-in-out',
    borderTopLeftRadius: '80%',
    borderTopRightRadius: '8%',
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '25%',
  };

  return (
    <div style={speedometerStyle}>
      <TouchControls />
      <div>Speed: {(Math.abs(speed) * Math.PI * 200).toFixed(2)} m/s</div>
      <SpeedMeter speed={Math.abs(speed)} />
      {/* <div>
        {
          JSON.stringify({ playerId, playerRaceData: {...raceData[playerId], position: undefined, B: '++++++++++++++ IN PROGRESS ++++++++++++++++++++', progress: undefined }, inProgress,a: '==========FINISHED==============', finished: finished.map((player) => ({
            id: player.id,
            place: player.place,
            laps: player.history.length
          })) }, null, 2)
        }
      </div> */}
    </div>
  );
};
