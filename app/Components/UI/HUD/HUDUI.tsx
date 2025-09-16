import * as THREE from 'three';
import HUD from './HUD/HUD';
import { StandingsUI } from './Standings/StandingsUI';
import { Speedometer } from './Speedometer/Speedometer';
import MiniMap from './MiniMap/MiniMap';
import AudioToggleButton from '@/Components/Audio/AudioToggle';
import WeaponStatus from '../WeaponStatus/WeaponStatus';
import { RaceOver } from '../RaceOver';
import { StartCountdown } from '@/Controllers/Game/StartTimer';
import './HUDUI.css';
import PrevNextButtons from '@/Components/Audio/PrevNextButtons';
import { ControlButtons } from '../TouchControls/ControlButtons';

export const HUDUI = ({
  speed,
  positions,
  curve,
  styles,
  trackId,
  playerRefs,
}: {
  speed: number;
  styles?: string;
  positions: { id: number; isPlayer: boolean; v: THREE.Vector3 }[];
  curve: THREE.Curve<THREE.Vector3>;
  trackId: number;
  playerRefs: React.RefObject<THREE.Object3D | null>[];
}) => {
  return (
    <>
      <HUD trackId={trackId} playerRefs={playerRefs} />
      <AudioToggleButton className={'hud-audio-toggle'} />
      <PrevNextButtons className={'prev-next'} />
      <StandingsUI />
      <WeaponStatus />
      <RaceOver />
      <StartCountdown />
      <ControlButtons />
      <Speedometer speed={speed} />
      <MiniMap positions={positions} curve={curve} styles={styles} />
    </>
  );
};
