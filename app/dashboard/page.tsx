"use client";

import { useEffect, useState, CSSProperties } from "react";
import { auth } from "@/Lib/Firebase";
import { onAuthStateChanged, getIdToken } from "firebase/auth";

interface UserData {
  email: string;
  displayName?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await getIdToken(currentUser);
          const res = await fetch(`/api/users/${currentUser.uid}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            throw new Error(`Failed to fetch user: ${res.statusText}`);
          }

          const data = await res.json();
          setUser(data.firestore || data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p style={{ fontSize: "18px", color: "#fff" }}>Loading...</p>;
  if (!user) return <p style={{ fontSize: "18px", color: "#fff" }}>No user logged in.</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const containerStyle: CSSProperties = {
    maxWidth: "600px",
    margin: "40px auto",
    padding: "24px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
  };

  const titleStyle: CSSProperties = {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "20px",
    textAlign: "center",
  };

  const fieldStyle: CSSProperties = {
    marginBottom: "12px",
    lineHeight: "1.5",
  };

  const labelStyle: CSSProperties = {
    fontWeight: "bold",
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Dashboard</h1>
      <p style={fieldStyle}><span style={labelStyle}>Email:</span> {user.email}</p>
      {user.displayName && (
        <p style={fieldStyle}><span style={labelStyle}>Display Name:</span> {user.displayName}</p>
      )}
      {user.createdAt && (
        <p style={fieldStyle}><span style={labelStyle}>Joined:</span> {new Date(user.createdAt).toLocaleString()}</p>
      )}
      {Object.entries(user)
        .filter(([key]) => !["email", "displayName", "createdAt"].includes(key))
        .map(([key, value]) => (
          <p key={key} style={fieldStyle}>
            <span style={labelStyle}>{key}:</span> {String(value)}
          </p>
        ))}
    </div>
  );
}
