// components/LogoutButton.tsx
"use client";

import { useUser } from "@/Controllers/Users/useUser";
import AuthGuard from "./AuthGaurd";

export default function LogoutButton() {
  const { signOutUser } = useUser();
  const handleLogout = async () => await signOutUser();

  return <AuthGuard><button onClick={handleLogout}>Logout</button></AuthGuard>;
}
