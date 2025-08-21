'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/Controllers/Settings/useSettingsStore';
import { useUserStore } from '../Users/useUserStore';
export function SettingsInitializer() {
  const { user } = useUserStore();
  const loadForUser = useSettingsStore((s) => s.loadForUser);

  useEffect(() => {
    if (user?.id) {
      loadForUser(user.id);
    }
  }, [user?.id, loadForUser]);

  return null; // no UI
}
