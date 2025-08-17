import { useGameStore } from "@/Controllers/Game/GameController";
import './WeaponStatus.css'

export default function WeaponStatus() {
    const { raceData } = useGameStore(s => s);
    const {useMine, cannonValue, shieldValue } = raceData[0];

    if (!useMine && cannonValue > 0 && shieldValue > 0) return null;

    return (
        <div className="weapon-status">
            {useMine && <span className="mine">Mine</span>}
            {cannonValue > 0 && <span className="cannon">Cannon</span>}
            {shieldValue > 0 && <span className="shield">Shield</span>}
        </div>
    );
}