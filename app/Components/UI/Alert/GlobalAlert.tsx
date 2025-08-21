// src/components/GlobalAlert.tsx
'use client';
import { useAlertStore } from '@/Controllers/Alert/useAlertStore';
import './GlobalAlert.css';

export default function GlobalAlert() {
  const { alert, clearAlert } = useAlertStore();

  if (!alert) return null;

  return (
    <div className="global-alert-container">
      <div className={`global-alert ${alert.type}`}>
        <span>{alert.message}</span>
        <button onClick={clearAlert}>&times;</button>
      </div>
    </div>
  );
}
