import { useMemo } from 'react'; // Import the useMemo hook from React for memoization.
import { useGameStore } from '@/Controllers/Game/GameController'; // Import the Zustand game store.
import { TOTAL_LAPS } from '@/Constants'; // Import the constant for the total number of laps.

/**
 * A custom React hook that calculates and provides the current race standings.
 * It leverages `useMemo` to optimize performance by re-calculating standings
 * only when the underlying `raceData` in the store changes.
 *
 * The standings are divided into two lists: `finished` racers and `inProgress` racers.
 * Racers are sorted by their performance (total time for finished, or lap count/progress for in-progress).
 *
 * @returns An object containing:
 * - `finished`: An array of racers who have completed all laps, sorted by total time.
 * - `inProgress`: An array of racers who are still racing, sorted by lap count and progress.
 * - `raceOver`: A boolean indicating if the local player has completed the race.
 */
export function useRaceStandings() {
  // Directly access raceData and playerId from the store's current state.
  // Note: While `getState()` is fine for initial values in `useMemo`,
  // for reactive updates, it's generally better to subscribe to specific parts of the store
  // using `useGameStore((state) => state.raceData)` within the component body,
  // and then pass that as a dependency to useMemo.
  // However, in this specific case, `useMemo`'s dependency array `[raceData]`
  // ensures re-calculation when `raceData` changes, making this approach functionally correct.
  // const raceData = raceData;
  // const playerId = playerId;
  const { raceData, playerId } = useGameStore.getState();

  // useMemo ensures that the calculation within its callback only runs when
  // `raceData` (its dependency) changes. This prevents unnecessary re-renders
  // and re-calculations of standings on every component render.
  return useMemo(() => {
    // 1. Calculate the list of finished racers
    const finishedList = Object.entries(raceData) // Get all racer entries from raceData.
      // Filter for racers who have completed TOTAL_LAPS and have a valid ID (>= 0).
      .filter(([id, player]) => player.lapCount >= TOTAL_LAPS && parseInt(id) >= 0)
      // Sort finished racers by their total accumulated race time in ascending order.
      .sort(
        ([, a], [, b]) =>
          a?.history.reduce((sum, lap) => sum + lap.time, 0) +
          a.penaltyTime - // Calculate total time for racer 'a'.
          (b?.history.reduce((sum, lap) => sum + lap.time, 0) + b.penaltyTime), // Calculate total time for racer 'b'.
      )
      // Map the sorted filtered data into a simplified structure for the standings.
      .map(([id, { history, penaltyTime }], idx) => ({
        id: parseInt(id), // Convert string ID back to number.
        place: idx + 1, // Assign place based on sorted index (1st, 2nd, 3rd...).
        finished: true, // Mark as finished.
        time: history.reduce((sum, lap) => sum + lap.time, 0), // Total time for the racer.
        history, // Include full history if needed for display.
        penaltyTime,
      }));

    // 2. Calculate the list of in-progress racers
    const progressList = Object.entries(raceData) // Get all racer entries.
      // Filter for racers who have NOT completed all laps and have a valid ID.
      .filter(([id]) => parseInt(id) >= 0)
      // Sort in-progress racers based on a hierarchy:
      // 1. By lap count (descending: more laps means higher rank).
      // 2. If lap counts are equal, by progress along the current lap (descending: further along means higher rank).
      // 3. If both are equal, by total accumulated time (ascending: faster time means higher rank).
      .sort(([, a], [, b]) => {
        return (
          a?.history.reduce((sum, lap) => sum + lap.time, 0) +
          a.penaltyTime - // Sort by total time (asc).
          (b?.history.reduce((sum, lap) => sum + lap.time, 0) + b.penaltyTime)
        );
      })
      // Map the sorted filtered data into a simplified structure for the standings.
      .map(([id, { history }], idx) => {
        return {
          id: parseInt(id), // Convert string ID back to number.
          // Calculate place by adding the number of already finished racers.
          place: idx + 1 + finishedList.length,
          finished: history.length >= TOTAL_LAPS,
          time: history?.reduce((sum, lap) => sum + lap.time, 0) || 0, // Total time so far.
          history, // Include full history.
        };
      });

    // Return the combined standings and a flag indicating if the local player's race is over.
    return {
      finished: finishedList,
      progressList,
      // Check if the local player has completed all laps.
      raceOver: (raceData[playerId]?.history?.length || 0) >= TOTAL_LAPS,
    };
  }, [raceData, playerId]); // Dependency array: re-run memoized function only when `raceData` changes.
}
