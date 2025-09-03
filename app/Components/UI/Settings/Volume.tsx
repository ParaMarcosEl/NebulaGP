import { useAudioStore } from '@/Controllers/Audio/useAudioStore';
import './Volume.css';

export function Volume() {
  const { masterVolume, sfxVolume, musicVolume, setMasterVolume, setSfxVolume, setMusicVolume } =
    useAudioStore((s) => s);

  return (
    <div className={'panel'}>
      <label className={'label'}>
        Master Volume: {Math.round(masterVolume * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
        />
      </label>
      <label className={'label'}>
        Music Volume: {Math.round(musicVolume * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={musicVolume}
          onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
        />
      </label>
      <label className={'label'}>
        SFX Volume: {Math.round(sfxVolume * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sfxVolume}
          onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
        />
      </label>
    </div>
  );
}
