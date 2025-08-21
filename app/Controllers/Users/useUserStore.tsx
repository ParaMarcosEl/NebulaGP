// @/Controllers/User/useUserStore.ts 
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

  fetchUserFromAPI: (uid: string) => Promise<User>;
  createUser: (newUser: User & { password?: string }) => Promise<{ message: string; uid: string }>;
  updateUser: (uid: string, updates: Partial<User>) => Promise<{ message: string }>;
  deleteUser: (uid: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),

  // Fetch user from backend
  fetchUserFromAPI: async (uid: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/users?uid=${uid}`);
      if (!res.ok) throw new Error('Failed to fetch user');

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch user');

      const userData = json.data;
      const createdAt = userData.createdAt?._seconds
        ? new Date(userData.createdAt._seconds * 1000)
        : null;

      const user: User = { ...userData, createdAt };
      set({ user, loading: false });
      return user;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch user', loading: false });
      throw err;
    }
  },

  // Create user via API
  createUser: async (newUser) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      const data: { message: string; uid: string } = await res.json();
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      set({ error: err.message || 'Failed to create user' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // Update user
  updateUser: async (uid, updates) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/users?uid=${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
      const data: { message: string } = await res.json();
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      set({ error: err.message || 'Failed to update user' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // Delete user
  deleteUser: async (uid) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/users?uid=${uid}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      set({ user: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete user' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // Sign out
  signOutUser: async () => {
    try {
      await signOut(auth);
      set({ user: null, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign out' });
      throw err;
    }
  },
}));

// Subscribe to Firebase auth changes once
export function initUserStore() {
  const { fetchUserFromAPI, setUser } = useUserStore.getState();
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
