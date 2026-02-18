// @/Controllers/User/useUserStore.ts
'use client';

import { create } from 'zustand';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/Lib/Firebase';
import { MultiplayerClient, type JoinPayload } from '@/Lib/multiplayer/MultiplayerClient';
import type { User } from '@/Constants/types';
import { useAlertStore } from '../Alert/useAlertStore';
import { fetchWithAppCheck } from './useUser';

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
  multiplayerClient: MultiplayerClient | null;

  setError: (error: string | null) => void;

  setUser: (user: User | null) => void;
  setMultiplayerClient: (client: MultiplayerClient | null) => void;
  connectMultiplayer: (joinPayload?: JoinPayload) => MultiplayerClient;
  disconnectMultiplayer: () => void;

  fetchUserFromAPI: (uid: string) => Promise<User>;
  createUser: (newUser: User & { password?: string }) => Promise<{
    [x: string]: string;
    message: string;
    uid: string;
  }>;
  updateUser: (uid: string, updates: Partial<User>) => Promise<{ message: string }>;
  deleteUser: (uid: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  multiplayerClient: null,

  setError: (error) => set({ error }),
  setUser: (user) => set({ user }),
  setMultiplayerClient: (client) => set({ multiplayerClient: client }),

  connectMultiplayer: (joinPayload = {}) => {
    const existingClient = get().multiplayerClient;
    if (existingClient) {
      existingClient.connect(joinPayload);
      return existingClient;
    }

    const newClient = new MultiplayerClient();
    newClient.connect(joinPayload);
    set({ multiplayerClient: newClient });
    return newClient;
  },

  disconnectMultiplayer: () => {
    const existingClient = get().multiplayerClient;
    existingClient?.disconnect();
    set({ multiplayerClient: null });
  },

  // Fetch user from backend
  fetchUserFromAPI: async (uid: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchWithAppCheck(`/api/users?uid=${uid}`);
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
      const res = await fetchWithAppCheck('/api/users', {
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
      const res = await fetchWithAppCheck(`/api/users?uid=${uid}`, {
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
      const res = await fetchWithAppCheck(`/api/users?uid=${uid}`, { method: 'DELETE' });
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
      if (!firebaseUser.emailVerified) {
        useAlertStore.getState().setAlert({
          type: 'error',
          message: 'Please verify your email before logging in.',
        });
        return;
      }
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
