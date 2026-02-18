import * as THREE from 'three';
import HUD from './HUD/HUD';
import { StandingsUI } from './Standings/StandingsUI';
import { Speedometer } from './Speedometer/Speedometer';
import MiniMap from './MiniMap/MiniMap';
import AudioToggleButton from '@/Components/Audio/AudioToggle';
import WeaponStatus from '../WeaponStatus/WeaponStatus';
import { RaceOver } from '../RaceOver/RaceOver';
import { StartCountdown } from '@/Controllers/Game/StartTimer';
import './HUDUI.css';
import PrevNextButtons from '@/Components/Audio/PrevNextButtons';
import { ControlButtons } from '../TouchControls/ControlButtons';
import RadialTouchInput from '../TouchControls/RadialTouchInput';

export const HUDUI = ({
  styles,
  trackId,
  playerRefs,
}: {
  styles?: string;
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
      <RadialTouchInput />
      <ControlButtons />
      <Speedometer />
      <MiniMap styles={styles} />
    </>
  );
};
