// components/LogoutButton.tsx
'use client';

import { useUserStore } from '@/Controllers/Users/useUserStore';
import AuthGuard from './AuthGaurd';

export default function LogoutButton() {
  const { signOutUser } = useUserStore();
  const handleLogout = async () => await signOutUser();

  return (
    <AuthGuard>
      <button onClick={handleLogout}>Logout</button>
    </AuthGuard>
  );
}
