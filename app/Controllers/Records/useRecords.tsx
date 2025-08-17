// /hooks/useRecords.ts
import { useState, useCallback } from 'react';
import { Record } from '@/Constants/types';

export function useRecords() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches records from the API based on optional filters.
   * @param userId (Optional) Filters records by a specific user ID.
   * @param trackId (Optional) Filters records by a specific track ID.
   * @returns A promise that resolves with the fetched records.
   */
  const fetchRecords = useCallback(async (userId?: string, trackId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (userId) queryParams.append('userId', userId);
      if (trackId) queryParams.append('trackId', trackId);

      const res = await fetch(`/api/records?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch records: ${res.statusText}`);
      }
      const data: Record[] = await res.json();
      setRecords(data);
      return data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to fetch records');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Creates a new record.
   * @param newRecord The record data to be created.
   * @returns A promise that resolves with the new record's ID.
   */
  const createRecord = useCallback(async (newRecord: Omit<Record, 'id' | 'createdAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create record');
      }
      const data: { message: string; recordId: string } = await res.json();
      // Optionally refetch records to update the list
      // await fetchRecords(newRecord.userId, newRecord.trackId);
      return data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to create record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Updates an existing record.
   * @param recordId The ID of the record to update.
   * @param updates The fields to update.
   * @returns A promise that resolves with a success message.
   */
  const updateRecord = useCallback(async (recordId: string, updates: Partial<Record>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/records?id=${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update record');
      }
      const data: { message: string } = await res.json();
      // Optionally refetch to update local state
      // This is a good place to optimistically update the state before refetching.
      return data;
      // eslint-disable-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to update record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Deletes a record.
   * @param recordId The ID of the record to delete.
   * @returns A promise that resolves with a success message.
   */
  const deleteRecord = useCallback(async (recordId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/records?id=${recordId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete record');
      }
      // Update state to remove the deleted record
      setRecords((prevRecords) => prevRecords.filter((record) => record.id !== recordId));
      const data: { message: string } = await res.json();
      return data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    records,
    loading,
    error,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
