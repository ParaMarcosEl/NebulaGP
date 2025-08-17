// components/UserProvider.tsx
"use client";

import { useEffect } from "react";
import { initUserStore } from "@/Controllers/Users/useUserStore";

export default function UserProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initUserStore();
  }, []);

  return <>{children}</>;
}
