// stores/userStore.ts
'use client';

import { create } from 'zustand';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/Lib/Firebase';
import type { User } from '@/Constants/types';

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  signOutUser: () => Promise<void>;
  fetchUserFromAPI: (uid: string) => Promise<User>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),

  // Sign out method
  signOutUser: async () => {
    try {
      await signOut(auth);
      set({ user: null, error: null });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign out' });
    }
  },

  // Fetch user from backend
  fetchUserFromAPI: async (uid: string) => {
    try {
      const res = await fetch(`/api/users?uid=${uid}`);
      if (!res.ok) throw new Error('Failed to fetch user');

      // inside fetchUserFromAPI
      const json = await res.json();

      if (!json.success) throw new Error(json.error || 'Failed to fetch user');

      // extract the actual data
      const userData = json.data;

      // convert Firestore timestamp to Date
      const createdAt = userData.createdAt?._seconds
        ? new Date(userData.createdAt._seconds * 1000)
        : null;

      set({
        user: {
          ...userData,
          createdAt,
        },
      });

      return { ...userData, createdAt };

      // const data: User = await res.json();
      // set({ user: data });
      // return data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch user' });
      throw err;
    }
  },
}));

// Subscribe to Firebase auth changes once
export function initUserStore() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fetchUserFromAPI, setUser, loading } = useUserStore.getState();
  onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
        await fetchUserFromAPI(firebaseUser.uid);
      } catch {
        // fallback if backend has no record
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          displayName: firebaseUser.displayName ?? '',
          name: firebaseUser.displayName ?? '',
        });
      }
    } else {
      setUser(null);
    }
  });
}
