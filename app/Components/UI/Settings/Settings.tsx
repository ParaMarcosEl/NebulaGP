// components/GameSettings.tsx
import { useSettingsStore } from "@/Controllers/Settings/useSettingsStore";

export default function GameSettings() {
  const invertPitch = useSettingsStore((s) => s.invertPitch);
  const setInvertPitch = useSettingsStore((s) => s.setInvertPitch);

  const touchEnabled = useSettingsStore((s) => s.touchEnabled);
  const setTouchEnabled = useSettingsStore((s) => s.setTouchEnabled);

  return (
    <div className="game-settings">
      <h2>Game Settings</h2>
        <div className="settings">
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
        </div>
    </div>
  );
}
