'use client';

export default function Achievements() {
  const achievements = [
    { title: 'First Flight', desc: 'Complete your first race', unlocked: true },
    { title: 'Speed Demon', desc: 'Finish a lap under 1 minute', unlocked: true },
    { title: 'Flawless Victory', desc: 'Win a race without taking damage', unlocked: false },
    { title: 'Veteran Pilot', desc: 'Compete in 100 races', unlocked: true },
    { title: 'Nebula Master', desc: 'Win on all maps', unlocked: false },
  ];

  return (
    <div>
      <h2>Achievements</h2>

      <div className="dashboard__grid achievements-grid">
        {achievements.map((ach, i) => (
          <div
            key={i}
            className={`dashboard__card achievement-card ${
              ach.unlocked ? 'achievement-unlocked' : 'achievement-locked'
            }`}
          >
            <h3>{ach.title}</h3>
            <p>{ach.desc}</p>
            <div className="achievement-status">{ach.unlocked ? '✓ Unlocked' : '🔒 Locked'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
