import { MiniMapWrapper } from './MiniMapWrapper';
import './MiniMap.css';
import cx from 'classnames';
import * as THREE from 'three';

export default function MiniMap({
  positions,
  curve,
  styles,
}: {
  styles?: string;
  positions: { id: number; isPlayer: boolean; v: THREE.Vector3 }[];
  curve: THREE.Curve<THREE.Vector3>;
}) {
  return (
    <div className={cx('map', styles)}>
      <MiniMapWrapper curve={curve} positions={positions} />
    </div>
  );
}
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
