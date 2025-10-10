// components/GameSettings.tsx
import { useSettingsStore } from '@/Controllers/Settings/useSettingsStore';
import { Volume } from './Volume';
export default function GameSettings() {
  const invertPitch = useSettingsStore((s) => s.invertPitch);
  const setInvertPitch = useSettingsStore((s) => s.setInvertPitch);

  const touchEnabled = useSettingsStore((s) => s.touchEnabled);
  const setTouchEnabled = useSettingsStore((s) => s.setTouchEnabled);

  const keyboardControls = [
    [['W', 'S'], 'Pitch Up / Down'],
    [['A', 'D'], 'Roll Left / Right'],
    [['I'], 'Accelerate'],
    [['K'], 'Brake'],
    [['J'], 'Use Item'],
  ];

  const gamepadControls = [
    [['X'], 'Accelerate'],
    [['☐'], 'Brake'],
    [['Left Stick'], 'Pitch / Roll'],
    [['R2'], 'Use Item'],
  ];

  return (
    <div className="game-settings">
      <h2>Game Settings</h2>
      <div className="settings">
        <h3>Audio:</h3>
        <Volume />
        <h3>Controls:</h3>
        <div>
          <label>
            <input
              type="checkbox"
              checked={invertPitch === -1}
              onChange={(e) => setInvertPitch(e.target.checked ? -1 : 1)}
            />
            Invert Pitch
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={touchEnabled}
              onChange={(e) => setTouchEnabled(e.target.checked)}
            />
            Enable Mobile Controls
          </label>
        </div>

        <div className="subheading">🕹️ Keyboard</div>

        <table className="control-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {keyboardControls.map(([keys, action], i) => (
              <tr key={i} className={i % 2 === 0 ? 'even-row' : ''}>
                <td>
                  {(keys as string[]).map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </td>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="subheading">🎮 Gamepad (PlayStation-style)</h3>
        <table className="control-table">
          <thead>
            <tr>
              <th>Button</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {gamepadControls.map(([keys, action], i) => (
              <tr key={i} className={i % 2 === 0 ? 'even-row' : ''}>
                <td>
                  {(keys as string[]).map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </td>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
