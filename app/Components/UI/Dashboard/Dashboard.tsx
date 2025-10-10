'use client';
import Achievements from './Achievements/Achievements';
import './Dashboard.css';
import ProfileOverview from './ProfileOverview/ProfileOverview';
import QuickLaunch from './QuickLaunch/QuickLaunch';
import RaceStats from './RaceStats/RaceStats';

export default function Dashboard() {
  return (
      <div className="dashboard">
        <section className="dashboard__section">
          <ProfileOverview />
        </section>
        <section className="dashboard__section">
          <QuickLaunch />
        </section>
        <section className="dashboard__section">
          <RaceStats />
        </section>
        <section className="dashboard__section">
          <Achievements />
        </section>
      </div>
  );
}
