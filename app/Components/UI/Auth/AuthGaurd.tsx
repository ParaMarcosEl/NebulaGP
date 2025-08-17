"use client";

import { useEffect, useState, ReactNode, ReactElement } from "react";
import { auth } from "@/Lib/Firebase"; // must be client SDK
import { onAuthStateChanged, User } from "firebase/auth";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactElement;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [userSession, setUserSession] = useState<User | undefined>(undefined);
  // undefined = loading, null = not logged in, User = logged in

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if(!currentUser) return;
      setUserSession(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (userSession === undefined) {
    return <p style={{ color: "#fff", textAlign: "center" }}>Checking authentication...</p>;
  }

  if (!userSession) {
    return fallback || null;
  }

  return <>{children}</>;
}
