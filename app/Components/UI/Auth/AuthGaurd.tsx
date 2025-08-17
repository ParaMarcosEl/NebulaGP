'use client';

import { ReactNode, ReactElement } from 'react';
import { useUserStore } from '@/Controllers/Users/useUserStore';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactElement;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user } = useUserStore();
  if (!user) {
    return fallback || null;
  }

  return <>{children}</>;
}
