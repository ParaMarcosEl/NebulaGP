'use client';

export default function RaceStats() {
  const stats = [
    { label: 'Total Races', value: 128 },
    { label: 'Wins', value: 64 },
    { label: 'Podium Finishes', value: 82 },
    { label: 'Best Lap', value: '00:57.23' },
    { label: 'Average Rank', value: '2.4' },
  ];

  const recentRaces = [
    { map: 'Nebula Drift', place: '1st', time: '00:58.12', xp: '+240' },
    { map: 'Aether Canyon', place: '2nd', time: '01:01.47', xp: '+180' },
    { map: 'Orion Gate', place: '1st', time: '00:56.79', xp: '+250' },
  ];

  return (
    <div>
      <h2>Race Statistics</h2>

      <div className="dashboard__grid">
        {stats.map((stat, i) => (
          <div key={i} className="dashboard__card">
            <h3>{stat.label}</h3>
            <p>{stat.value}</p>
          </div>
        ))}
      </div>

      <h3 className="dashboard__subheading">Recent Races</h3>
      <table className="dashboard__table">
        <thead>
          <tr>
            <th>Track</th>
            <th>Place</th>
            <th>Time</th>
            <th>XP</th>
          </tr>
        </thead>
        <tbody>
          {recentRaces.map((race, i) => (
            <tr key={i} className={i % 2 === 0 ? 'even-row' : ''}>
              <td>{race.map}</td>
              <td>{race.place}</td>
              <td>{race.time}</td>
              <td>{race.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
