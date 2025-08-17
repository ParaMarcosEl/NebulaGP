"use client";

import { useRecords } from "@/Controllers/Records/useRecords";

import styles from "./Leaderboard.module.css";
import { useEffect } from "react";
import { formatDate, formatTime } from "@/Utils";

interface LeaderboardProps {
  trackId: string;
}

export default function Leaderboard({ trackId }: LeaderboardProps) {
    const { records, loading, error, fetchRecords } = useRecords();

    useEffect(() => {
        fetchRecords(undefined, trackId);
    }, [trackId]);


  if (loading) return <p className={styles.message}>Loading leaderboard...</p>;
  if (error) return <p className={styles.message}>Error loading leaderboard</p>;
  if (!records || records.length === 0)
    return <p className={styles.message}>No records yet.</p>;
  console.log(records[0].createdAt)
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Leaderboard</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Time</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {records.sort((a, b) => a.totalTime - b.totalTime).map((record, idx) => (
            <tr key={record.id}>
              <td>{idx + 1}</td>
              <td>{record.name}</td>
              <td>{formatTime(record.totalTime)}</td>
              <td>{formatDate(record.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}