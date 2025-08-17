// /hooks/useUser.ts
import { useState, useCallback, useEffect } from "react";
import type { User } from "@/Constants/types";
import {onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from "@/Lib/Firebase";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches user data from the API.
   * @param uid The unique ID of the user.
   * @returns A promise that resolves with the User data.
   */
  const fetchUser = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users?uid=${uid}`);
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.statusText}`);
      const data: User = await res.json();
      setUser(data);
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to fetch user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Creates a new user via the API.
   * @param newUser The user object to create, including a password.
   * @returns A promise that resolves with the API's success message and UID.
   */
  const createUser = useCallback(async (newUser: User & { password?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }
      const data: { message: string; uid: string } = await res.json();
      // The API returns { message, uid }, not a full User object.
      // We don't set user state here since we don't have the full data.
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to create user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Updates an existing user's data.
   * @param uid The unique ID of the user to update.
   * @param updates The fields to update.
   * @returns A promise that resolves with the API's success message.
   */
  const updateUser = useCallback(async (uid: string, updates: Partial<User>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users?uid=${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user");
      }
      const data: { message: string } = await res.json();
      // The API returns a message, not a full User object.
      // You would typically refetch the user to update the state.
      // For now, we'll just return the message.
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to update user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Deletes a user from the database.
   * @param uid The unique ID of the user to delete.
   */
  const deleteUser = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users?uid=${uid}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }
      setUser(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Signs the current user out.
   */
  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
      throw err;
    }
  }, []);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // First try to fetch full user from backend
        const dbUser = await fetchUser(firebaseUser.uid);
        setUser(dbUser);
      } catch {
        // If backend has no record yet, fallback to Firebase auth data
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
    signOutUser
  };
}
