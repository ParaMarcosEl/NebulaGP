import { useUserStore } from "@/Controllers/Users/useUserStore";

export default function ProfileOverview() {
    const { user } = useUserStore(s => s );
  return (
    <div>
      <h2>Commander Profile</h2>
      <div className="dashboard__grid">
        <div className="dashboard__card">
          <h3>Player</h3>
          <p>{user?.displayName}</p>
        </div>
        <div className="dashboard__card">
          <h3>Rank</h3>
          <p>Elite Pilot</p>
        </div>
        <div className="dashboard__card">
          <h3>Credits</h3>
          <p>12,450</p>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label>XP Progress</label>
        <div className="dashboard__progress">
          <div className="dashboard__progress-fill" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
}
