// components/LogoutButton.tsx
'use client';

import { useUserStore } from '@/Controllers/Users/useUserStore';

export default function LogoutButton({ className }: { className: string }) {
  const { signOutUser } = useUserStore();
  const handleLogout = async () => await signOutUser();

  return (
    <button className={className} onClick={handleLogout}>
      Logout
    </button>
  );
}
