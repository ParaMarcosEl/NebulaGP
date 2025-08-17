// types/User.ts
export interface User {
  id?: string;        // Firestore document ID
  email?: string | null;
  name?: string | null;
  displayName?: string | null,
  age?: number;
  role?: string;
  createdAt?: string;
}

// types/records.ts
// /hooks/useRecords.ts
export interface Record {
  id: string;
  name: string;
  userId: string;
  trackId: string;
  totalTime: number;
  lapTimes: number[];
  createdAt: string;
  ghostFrames?: number[]; // converted Float32Array
  history?: unknown;      // raceData[id].history type
}


export type RecordMessage =
  | { type: "records:init"; data: Record[] }
  | { type: "records:new"; data: Record }
  | { type: "records:update"; data: Record }
  | { type: "records:delete"; id: string };
