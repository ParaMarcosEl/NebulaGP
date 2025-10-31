import { MiniMapWrapper } from './MiniMapWrapper';
import './MiniMap.css';
import cx from 'classnames';

export default function MiniMap({
  styles,
}: {
  styles?: string;
}) {
  return (
    <div className={cx('map', styles)}>
      <MiniMapWrapper />
    </div>
  );
}
