// @/Components/Alert/useAlertStore.ts
'use client';

import { create } from 'zustand';

type AlertType = 'success' | 'error' | 'info';

interface Alert {
  type: AlertType;
  message: string;
}

interface AlertState {
  alert: Alert | null;
  setAlert: (alert: Alert) => void;
  clearAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alert: null,

  setAlert: (alert) => {
    set({ alert });
    // Auto-dismiss after 4s
    setTimeout(() => set({ alert: null }), 4000);
  },

  clearAlert: () => set({ alert: null }),
}));
