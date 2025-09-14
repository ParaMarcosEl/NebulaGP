// hooks/useUser.ts
import { useState, useCallback, useEffect } from 'react';
import type { User } from '@/Constants/types';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, appCheck } from '@/Lib/Firebase';
import { getToken } from 'firebase/app-check';

// Fetch wrapper that automatically attaches App Check token and retries once on failure
export async function fetchWithAppCheck(url: string, options: RequestInit = {}) {
  if (!appCheck) throw new Error("App Check not initialized");

  const { token } = await getToken(appCheck, /* forceRefresh */ false);

  const headers = new Headers(options.headers || {});
  headers.set("x-firebase-appcheck", token);

  return fetch(url, { ...options, headers });
}


export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAppCheck(`/api/users?uid=${uid}`);
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.statusText}`);
      const data: User = await res.json();
      setUser(data);
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (newUser: User & { password?: string }) => {
    setLoading(true);
    setError(null);
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
      return await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (uid: string, updates: Partial<User>) => {
    setLoading(true);
    setError(null);
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
      return await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAppCheck(`/api/users?uid=${uid}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      setUser(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
      throw err;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const dbUser = await fetchUser(firebaseUser.uid);
          setUser(dbUser);
        } catch {
          // Fallback to Firebase auth data if backend fails
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            displayName: firebaseUser.displayName,
            name: firebaseUser.displayName,
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
    setUser,
    signOutUser,
  };
}
