import { CSSProperties } from 'react';
import { MAX_SPEED } from '@/Constants';
import { useGameStore } from '@/Controllers/Game/GameController';

export const Speedometer = function () {
  const playerSpeed = useGameStore(s => s.playerSpeed);

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
  const speedPercent = Math.min(playerSpeed / MAX_SPEED, 1);

  return (
    <div className="speedometer" style={speedometerStyle}>
      <div>Speed: {(Math.abs(playerSpeed) * Math.PI * 200).toFixed(2)} m/s</div>
      <div className="meter-wrapper" style={meterWrapper}>
        <div
          className="meter"
          style={{ ...meterBar, width: `${Math.min(speedPercent * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};

const meterWrapper: CSSProperties = {
  width: '100%',
  height: '10px',
  backgroundColor: '#333',
  borderRadius: '4px',
  overflow: 'hidden',
  borderTopLeftRadius: '80%',
  borderTopRightRadius: '0%',
  borderBottomRightRadius: '25%',
  borderBottomLeftRadius: '0',
};

const meterBar: CSSProperties = {
  height: '100%',
  backgroundColor: '#00ff88',
  transition: 'width 0.1s linear',
  borderTopLeftRadius: '80%',
  borderTopRightRadius: '0%',
  borderBottomRightRadius: '25%',
  borderBottomLeftRadius: '0',
};
