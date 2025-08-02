import { ThrottleLever } from '../Throttle';
import { MiniMapWrapper } from './MiniMapWrapper';
import * as THREE from 'three';

export default function MiniMap({
  positions,
  curve,
}: {
  positions: { id: number; isPlayer: boolean; v: THREE.Vector3 }[];
  curve: THREE.Curve<THREE.Vector3>;
}) {
  return (
    <div style={mapStyle}>
      <MiniMapWrapper curve={curve} positions={positions} />
      <ThrottleLever />
    </div>
  );
}

const mapStyle: React.CSSProperties = {
  zIndex: 1,
  position: 'absolute',
  bottom: 20,
  right: 20,
  width: 150,
  height: 150,
  background: 'rgba(0, 0, 0, 0)',
};

// const dotStyle = (x: number, y: number): React.CSSProperties => ({
//   position: 'absolute',
//   width: 4,
//   height: 4,
//   borderRadius: '50%',
//   background: 'white',
//   left: `${x * 100}%`,
//   top: `${y * 100}%`,
//   transform: 'translate(-50%, -50%)',
// });
