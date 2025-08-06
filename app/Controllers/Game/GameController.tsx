'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */ // Disables ESLint warning for unused variables, common in type definitions.
import { create } from 'zustand'; // Import `create` function from Zustand for state management.
import { devtools } from 'zustand/middleware'; // Import `devtools` middleware for Redux DevTools integration.
import * as THREE from 'three'; // Import the Three.js library for 3D vector operations.
import { RacerProgressType, TOTAL_LAPS } from '@/Constants'; // Import constants like total laps from a relative path.

// --- Helpers ---
/**
 * Helper function to provide a default initial state for a single racer's data.
 * This ensures consistency when new racers are added to `raceData`.
 * @returns An object conforming to the `RaceData` type with default values.
 */
const defaultRaceData = (): RaceData => ({
  position: new THREE.Vector3(), // Initial position at (0,0,0).
  progress: 0, // Initial progress along the track.
  place: 0, // Initial race placement.
  lapCount: 0, // Initial lap count.
  isPlayer: false, // Flag to indicate if this data belongs to the local player.
  history: [], // Array to store records of completed laps.
});

// --- Types Definitions ---

/**
 * Defines the possible states of the race.
 * 'idle': Race has not started yet.
 * 'countdown': Race is about to start (e.g., 3-2-1 countdown).
 * 'racing': Race is actively in progress.
 */
export type RaceStatus = 'idle' | 'countdown' | 'racing';

/**
 * Defines the structure for a single racer's data within the game state.
 */
type RaceData = {
  position: THREE.Vector3; // Current 3D position of the racer's craft.
  progress: number; // Current progress along the track (normalized, e.g., 0 to 1).
  place: number; // Current ranking in the race.
  lapCount: number; // Number of laps completed by this racer.
  isPlayer: boolean; // True if this data corresponds to the local player.
  history: LapRecord[]; // Historical records of each completed lap.
};

/**
 * Defines the structure for a single lap record.
 */
export type SingleLapRecord = {
  lapNumber: number; // The number of the lap completed.
  time: number; // The time taken to complete this specific lap.
  timestamp: number; // The timestamp when this lap was completed (e.g., performance.now()).
};

/**
 * Defines the structure for game settings.
 */
export type GameSettings = {
  soundEnabled: boolean; // Whether in-game sounds are enabled.
  musicEnabled: boolean; // Whether background music is enabled.
  controlScheme: 'keyboard' | 'gamepad'; // The currently selected control input method.
};

/**
 * Alias for SingleLapRecord, used for clarity in some contexts.
 */
export type LapRecord = {
  lapNumber: number;
  time: number;
  timestamp: number;
};

/**
 * Defines the type for the `raceData` object, which is a record (dictionary)
 * where keys are racer IDs (numbers) and values are `RaceData` objects.
 */
export type RaceDataType = Record<
  number,
  {
    position: THREE.Vector3;
    progress: number;
    place: number;
    lapCount: number;
    isPlayer: boolean;
    history: LapRecord[];
  }
>;

/**
 * Defines the possible phases of the local player in the game.
 * 'Idle': Player is not actively racing (e.g., in menu, waiting for race to start).
 * 'Race': Player is actively participating in the race.
 * 'Finished': Player has completed the race.
 */
type PlayerPhaseType = 'Idle' | 'Race' | 'Finished';

/**
 * Defines the entire state structure of the game store.
 */
type GameState = {
  baseSpeed: number;
  playerSpeed: number;
  lapTime: number; // Current time for the active lap (for the local player).
  totalTime: number; // Total accumulated time for the local player across all completed laps.
  raceCompleted: boolean; // True if the local player has completed the race.
  lapHistory: SingleLapRecord[]; // Historical lap records for the local player.
  settings: GameSettings; // Current game settings.
  lapStartTime: number; // Timestamp when the current lap started.
  lastProgresses: Record<number, number>; // Stores the last known progress for each racer ID.
  finishedCrafts: number[]; // An array of racer IDs that have completed the race.
  playerId: number; // The ID of the local player's craft.
  raceData: Record<
    // Comprehensive data for all racers (player and bots).
    number,
    {
      useCannon?: boolean;
      boosting: boolean;
      position: THREE.Vector3;
      progress: number;
      place: number;
      lapCount: number;
      isPlayer: boolean;
      history: LapRecord[];
    }
  >;
  playerPhase: 'Idle' | 'Race' | 'Finished'; // The current phase of the local player.
  track: THREE.Curve<THREE.Vector3>; // The current 3D track curve being used for the race.
  raceStatus: RaceStatus; // The overall status of the race (idle, countdown, racing).

  position: THREE.Vector3;

  // New terrain loading properties
  totalTerrainChunks: number;
  loadedTerrainChunks: number;

  litTerrainMaterialLoaded: boolean; // New state variable
};

/**
 * Type for updating multiple racer positions.
 */
export type RacePositonsType = { id: number; position: THREE.Vector3 };
/**
 * Type for updating multiple racer progresses.
 */
export type RaceProgressesType = { id: number; progress: number };

/**
 * Defines all the actions (functions) that can modify the game state.
 */
type GameActions = {
  setCannon: (id: number, useCannon?: boolean) => void; // Sets whether the player can use the cannon.
  setLitTerrainMaterialLoaded: (loaded: boolean) => void;
  setTotalTerrainChunks: (count: number) => void;
  incrementLoadedTerrainChunks: () => void;
  resetTerrainLoading: () => void;
  setPosition: (pos: THREE.Vector3) => void;
  applyBoost: (id: number) => void;
  setPlayerSpeed: (speed: number) => void;
  setPlayerId: (id: number) => void; // Sets the ID of the local player.
  setLapTime: (time: number) => void; // Updates the current lap time and total time.
  completeLap: (id: number) => void; // Records a completed lap for a specific racer.
  completeRace: () => void; // Marks the local player's race as completed.
  reset: () => void; // Resets the entire game state to its initial values.
  setLapStartTime: (time: number) => void; // Sets the timestamp for the start of the current lap.
  setRacePosition: (id: number, pos: THREE.Vector3) => void; // Updates a racer's 3D position.
  setRaceProgress: (id: number, progress: number) => void; // Updates a racer's progress along the track.
  updateRaceData: (id: number, updates: Partial<GameState['raceData']>) => void; // Applies partial updates to a specific racer's data.
  markFinished: (id: number) => void; // Marks a racer as having finished the race and assigns their place.
  updateRacePositions: (positions: RacePositonsType[]) => void; // Updates positions for multiple racers.
  updateProgresses: (positions: RaceProgressesType[]) => void; // Updates progresses for multiple racers.
  updateLastProgresses: (progresses: Record<number, number>[]) => void; // Updates the last known progress for multiple racers.
  setPlayerPhase: (state: PlayerPhaseType) => void; // Sets the local player's current phase.
  setTrack: (track: THREE.Curve<THREE.Vector3>) => void; // Sets the active 3D track curve.
  setRaceStatus: (status: RaceStatus) => void; // Sets the overall race status.
  setBaseSpeed: (speed: number) => void;
};

/**
 * Combines `GameState` and `GameActions` to define the complete type of the Zustand store.
 */
let timeout: NodeJS.Timeout = setTimeout(() => {}, 5000); // Default timeout for cannon use
type GameStore = GameState & GameActions;

// Default settings for the game.
const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  controlScheme: 'keyboard',
};

/**
 * The main Zustand store for managing game state.
 * It uses `devtools` middleware for easy debugging with Redux DevTools.
 */
export const useGameStore = create(
  devtools<GameStore>((set, get) => ({
    // --- Initial State ---
    baseSpeed: 2,
    playerSpeed: 2,
    lapTime: 0, // Current lap time, initialized to 0.
    totalTime: 0, // Total race time, initialized to 0.
    raceCompleted: false, // Race not completed initially.
    lapHistory: [], // Empty lap history.
    settings: defaultSettings, // Apply default game settings.
    lapStartTime: performance.now(), // Set the initial lap start time to the current performance timestamp.
    lastProgresses: {}, // Empty object for last known progresses.
    finishedCrafts: [], // No crafts finished initially.
    playerId: -1, // Player ID is -1 until set.
    raceData: {}, // Empty object for all racers' data.
    playerPhase: 'Idle', // Player starts in 'Idle' phase.
    // Default track: A simple 3D Catmull-Rom curve for initial state.
    track: new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(50, 0, 0),
        new THREE.Vector3(50, 50, 0),
        new THREE.Vector3(50, 50, 100),
        new THREE.Vector3(50, 0, 100),
        new THREE.Vector3(0, 0, 100),
      ],
      true, // `true` indicates a closed loop curve.
    ),
    raceStatus: 'idle', // Initial race status is 'idle'.

    position: new THREE.Vector3(0, 0, 0),

    // New terrain loading state initialization
    totalTerrainChunks: 0,
    loadedTerrainChunks: 0,
    litTerrainMaterialLoaded: false,
    // --- Actions (Functions to modify state) ---
    setLitTerrainMaterialLoaded: (loaded: boolean) => set({ litTerrainMaterialLoaded: loaded }),
    setTotalTerrainChunks: (count) =>
      set({
        totalTerrainChunks: count,
        loadedTerrainChunks: 0, // Reset loaded count when a new total is set
      }),
    incrementLoadedTerrainChunks: () =>
      set((state) => ({
        loadedTerrainChunks: state.loadedTerrainChunks + 1,
      })),
    resetTerrainLoading: () =>
      set({
        totalTerrainChunks: 0,
        loadedTerrainChunks: 0,
      }),
    setPosition: (pos) => set(() => ({ position: pos })),
    setBaseSpeed: (speed: number) => set({ baseSpeed: speed }),

    applyBoost: (id: number) => {
      const { raceData } = get();

      const player = raceData[id];
      if (!player) return;

      // Apply boost logic, e.g. increasing playerSpeed temporarily
      // (You may want to store boost state in raceData or GameState)

      // Basic approach: instantly increase playerSpeed for the local player only
      const currentSpeed = get().playerSpeed;
      const newRaceData = get().raceData;
      newRaceData[id].boosting = true;
      const isPlayer = id === get().playerId;
      set({
        ...(isPlayer && { playerSpeed: currentSpeed + 1 }),
        raceData: newRaceData,
      });

      // Optionally reset after timeout
      if (isPlayer) {
        newRaceData[id].boosting = false;
        setTimeout(() => {
          set({ playerSpeed: get().baseSpeed, raceData: newRaceData });
        }, 2000);
      }
    },

    setCannon: (id: number, useCannon?: boolean) => {
      const { raceData } = get();

      const player = raceData[id];
      if (!player) return;

      // Basic approach: set a flag to indicate cannon use
      const newRaceData = get().raceData;
      newRaceData[id].useCannon = useCannon;
      const isPlayer = id === get().playerId;
      set({
        raceData: newRaceData,
      });

      clearTimeout(timeout);
      // Optionally reset after timeout
      timeout = setTimeout(() => {
        newRaceData[id].useCannon = false;
        set({ raceData: newRaceData });
      }, 5000);
    },

    setPlayerSpeed: (speed: number) => set({ playerSpeed: speed }),
    /**
     * Sets the overall status of the race.
     * @param status - The new RaceStatus ('idle', 'countdown', 'racing').
     */
    setRaceStatus: (status) => {
      set({ raceStatus: status });
    },

    /**
     * Sets the active 3D track for the race.
     * @param index - The THREE.Curve<THREE.Vector3> object representing the track.
     */
    setTrack: (index: THREE.Curve<THREE.Vector3>) => set({ track: index }),

    /**
     * Sets the current phase of the local player.
     * @param phase - The new PlayerPhaseType ('Idle', 'Race', 'Finished').
     */
    setPlayerPhase: (phase: PlayerPhaseType) => set({ playerPhase: phase }),

    /**
     * Sets the ID of the local player.
     * @param id - The numerical ID for the player.
     */
    setPlayerId: (id) => set({ playerId: id }),

    /**
     * Updates the current lap time and calculates the total race time for the local player.
     * @param newTime - The elapsed time for the current lap.
     */
    setLapTime: (newTime) => {
      const { raceCompleted, lapHistory } = get(); // Get current state values.
      if (raceCompleted) return; // If race is completed, do not update lap time.

      // Calculate total time from completed laps in history.
      const completedTime = lapHistory.reduce(
        (sum, lap, idx) => (idx < TOTAL_LAPS ? sum + lap.time : 0), // Sum times for laps up to TOTAL_LAPS.
        0,
      );
      // Update lapTime and totalTime in the state.
      set({
        lapTime: newTime,
        totalTime: completedTime + newTime,
      });
    },

    /**
     * Records a completed lap for a specific racer (identified by `id`).
     * This action updates their lap count, history, and calculates the lap time.
     * @param id - The ID of the racer who completed a lap.
     */
    completeLap: (id) =>
      set((state) => {
        // If the racer has already completed all total laps, do nothing.
        if ((state.raceData[id]?.history?.length || 0) >= TOTAL_LAPS) return state;

        const now = performance.now(); // Get current timestamp.

        // Get existing race data for the racer, or use default if not present.
        const prev = state.raceData[id] ?? {
          position: new THREE.Vector3(),
          progress: 0,
          place: 0,
          lapCount: 0,
          isPlayer: false,
          history: [],
        };

        // Calculate the time taken for the just-completed lap.
        // It's `now` minus the timestamp of the last recorded lap, or `lapStartTime` if it's the first lap.
        const lapTime = now - ((prev?.history || []).at(-1)?.timestamp ?? state.lapStartTime);

        // Create a new lap record.
        const updatedLap = {
          lapNumber: (prev?.lapCount || 0) + 1, // Increment lap count.
          time: lapTime,
          timestamp: now,
        };

        // Add the new lap record to the racer's history.
        const newHistory = [...(prev?.history || []), updatedLap];

        // Update the `raceData` for this specific racer.
        return {
          raceData: {
            ...state.raceData, // Keep existing race data for other racers.
            [id]: {
              ...prev, // Copy existing data for this racer.
              lapCount: (prev?.lapCount || 0) + 1, // Increment lap count.
              history: newHistory, // Update history with the new lap.
            },
          },
        };
      }),

    /**
     * Marks the local player's race as completed.
     */
    completeRace: () => set({ raceCompleted: true }),

    /**
     * Resets the entire game state to its initial values.
     * This is typically called when starting a new race or returning to a main menu.
     */
    reset: () =>
      set({
        lapTime: 0,
        totalTime: 0,
        raceCompleted: false,
        lapHistory: [],
        lapStartTime: performance.now(),
        finishedCrafts: [],
        raceData: {},
        lastProgresses: {},
      }),

    /**
     * Sets the timestamp for when the current lap started.
     * @param time - The timestamp (e.g., from `performance.now()`).
     */
    setLapStartTime: (time) => set({ lapStartTime: time }),

    /**
     * Updates the 3D position of a specific racer.
     * @param id - The ID of the racer.
     * @param position - The new THREE.Vector3 position.
     */
    setRacePosition: (id, position) =>
      set((state) => ({
        raceData: {
          ...state.raceData, // Keep existing race data.
          [id]: {
            ...state.raceData[id], // Copy existing data for this racer.
            position, // Update only the position.
          },
        },
      })),

    /**
     * Updates the progress along the track for a specific racer.
     * @param id - The ID of the racer.
     * @param progress - The new progress value (e.g., 0 to 1).
     */
    setRaceProgress: (id, progress) =>
      set((state) => ({
        raceData: {
          ...state.raceData, // Keep existing race data.
          [id]: {
            ...state.raceData[id], // Copy existing data for this racer.
            progress, // Update only the progress.
          },
        },
      })),

    /**
     * Updates the `lastProgresses` map with new progress values for multiple racers.
     * This is useful for tracking previous progress to detect lap completions.
     * @param progresses - An array of objects, each containing a racer ID and their progress.
     */
    updateLastProgresses: (progresses: Record<number, number>[]) => {
      set((state) => {
        const updatedLastProgresses = { ...state.lastProgresses }; // Create a mutable copy.
        progresses.forEach((prog) => {
          // Iterate over each progress object in the array.
          Object.entries(prog).forEach(([id, progress]) => {
            // Update the `lastProgresses` for each racer.
            updatedLastProgresses[parseInt(id)] = progress;
          });
        });

        return { lastProgresses: updatedLastProgresses }; // Return the updated state.
      });
    },

    /**
     * Updates the 3D positions for multiple racers simultaneously.
     * @param positions - An array of `RacePositonsType` objects.
     */
    updateRacePositions: (positions) =>
      set((state) => {
        const updated = { ...state.raceData }; // Create a mutable copy of `raceData`.
        positions.forEach(({ id, position }) => {
          // For each position update, merge with existing data or use default.
          updated[id] = {
            ...(updated[id] ?? defaultRaceData()), // Use existing data or default if new racer.
            position, // Apply the new position.
          };
        });
        return { raceData: updated }; // Return the updated state.
      }),

    /**
     * Updates the progress values for multiple racers simultaneously.
     * Also updates `lastProgresses` based on the current `raceData` before applying new progresses.
     * @param progresses - An array of `RaceProgressesType` objects.
     */
    updateProgresses: (progresses) =>
      set((state) => {
        const updatedRaceData = { ...state.raceData }; // Mutable copy of raceData.
        // Create a `lastProgresses` object from the current `raceData` before applying new updates.
        const lastProgresses: Record<number, number> = {};
        for (const [id, data] of Object.entries(state.raceData)) {
          lastProgresses[+id] = data.progress;
        }

        progresses.forEach((prog) => {
          // Update `raceData` for each racer with their new progress.
          updatedRaceData[prog.id] = {
            ...(updatedRaceData[prog.id] ?? defaultRaceData()), // Use existing data or default.
            progress: prog.progress, // Apply the new progress.
          };
        });
        // Return updated `raceData` and the `lastProgresses` (which reflects state *before* these updates).
        return { raceData: updatedRaceData, lastProgresses };
      }),

    /**
     * Applies a partial update to a specific racer's data.
     * This is a generic action to update any part of a racer's `RaceData` object.
     * @param id - The ID of the racer to update.
     * @param partialUpdate - An object containing the properties to update.
     */
    updateRaceData: (id, partialUpdate) =>
      set((state) => {
        // Get existing data for the racer, or use default if not present.
        const existing = state.raceData[id] ?? {
          position: new THREE.Vector3(),
          progress: 0,
          place: 0,
          lapCount: 0,
          isPlayer: state.playerId === id,
          history: [],
        };

        // Return updated state with the merged partial update.
        return {
          raceData: {
            ...state.raceData, // Keep existing race data for other racers.
            [id]: {
              ...existing, // Copy existing data.
              ...partialUpdate, // Apply the partial updates, overwriting existing properties.
            },
          },
        };
      }),

    /**
     * Marks a specific racer as having finished the race.
     * This action adds their ID to `finishedCrafts` and assigns their final place.
     * @param id - The ID of the racer who finished.
     */
    markFinished: (id) =>
      set((state) => {
        // Check if the craft is already marked as finished.
        const already = state.finishedCrafts.includes(id);
        if (already) return {}; // If already finished, do nothing.

        // Calculate the total time for the finished racer from their history.
        const time =
          state.raceData[id]?.history.reduce(
            (sum, l, idx) => (idx < TOTAL_LAPS ? sum + l.time : 0),
            0,
          ) ?? 0;

        // Return updated state.
        return {
          finishedCrafts: [...state.finishedCrafts, id], // Add the new finished craft ID.
          raceData: {
            ...state.raceData, // Keep existing race data.
            [id]: {
              ...state.raceData[id], // Copy existing data for this racer.
              place: state.finishedCrafts.length + 1, // Assign their place based on how many have finished before them.
            },
          },
        };
      }),
  })),
);
