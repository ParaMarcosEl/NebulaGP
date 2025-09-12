import { useFrame } from '@react-three/fiber'; // Imports the useFrame hook from @react-three/fiber, which runs code every frame.
import * as THREE from 'three'; // Imports the entire Three.js library for 3D math and objects.
import { useGameStore } from '@/Controllers/Game/GameController'; // Imports the Zustand game state store.
import { useRef } from 'react'; // Imports the useRef hook from React for mutable references.
// import { TOTAL_LAPS } from '@/Constants'; // Imports the constant defining the total number of laps in the race.

// Constants for controlling the update frequency of race progress.
const UPDATE_INTERVAL_MS = 50; // How often (in milliseconds) the race progress updates are processed.
const MAX_DELTA_MS = 200; // Maximum allowed delta time (in milliseconds) to prevent large jumps if frame rate drops significantly.

/**
 * A custom React hook that manages and updates race progress for both the player and bots.
 * It runs on every frame, but processes updates at a fixed interval to optimize performance.
 * It also handles lap completion and race completion logic.
 *
 * @param playerRef - A React ref to the player's 3D object (THREE.Object3D).
 * @param playerRefs - An array of React refs to the bot's 3D objects (THREE.Object3D).
 * @param curve - The THREE.Curve<THREE.Vector3> representing the race track path.
 * @param onLapComplete - Optional callback function triggered when a lap is completed by any racer.
 * @param onRaceComplete - Optional callback function triggered when the player completes the entire race.
 */
export function useRaceProgress({
  playerRefs,
  // onLapComplete,
  // onRaceComplete,
}: {
  playerRefs: React.RefObject<THREE.Object3D>[]; // Array of references to bot 3D models.
  onLapComplete?: () => void; // Callback for when any racer completes a lap.
  onRaceComplete?: () => void; // Callback for when the player completes the race.
}) {
  // Destructure state and actions from the game store.
  const {
    // completeLap,
    // setRaceComplete,
    // setPlayerPhase,
    playerId, // The ID of the local player.
    setRacePosition, // Action to set a racer's 3D position in the store.
    updateRacePositions, // Action to update positions for multiple racers.
    updateProgresses, // Action to update progress for multiple racers.
  } = useGameStore((state) => state); // Subscribes to the entire state of the game store.

  // useRef to keep track of elapsed time for the update interval.
  const elapsedRef = useRef(0);

  // useFrame hook runs a function on every frame rendered by @react-three/fiber.
  // `_` is the state object (renderer, scene, camera, etc.), `delta` is the time since last frame in seconds.
  useFrame((_, delta) => {
    // If the document is hidden (e.g., browser tab is not active), pause updates to save resources.
    if (document.hidden) return;

    // Convert delta from seconds to milliseconds and clamp it to MAX_DELTA_MS
    // to prevent physics/game logic from breaking if there's a very long frame.
    const safeDelta = Math.min(delta * 1000, MAX_DELTA_MS);
    elapsedRef.current += safeDelta; // Accumulate elapsed time.

    // Check if enough time has passed to trigger an update.
    if (elapsedRef.current >= UPDATE_INTERVAL_MS) {
      elapsedRef.current = 0; // Reset elapsed time for the next interval.

      // --- Update Player Position in Store ---
      if (playerRefs[0].current) {
        setRacePosition(playerId, playerRefs[0].current.position); // Update the player's 3D position in the game store.
      }

      // --- Update Bot Positions in Store ---
      // Create an array of objects containing bot IDs and their current positions.
      const playerPositions = playerRefs.map((bot, idx) => ({
        id: idx, // Assign ID based on array index.
        position: bot.current?.userData.curvePosition, // Get position from bot's userData (where it's stored by bot controller).
      }));
      updateRacePositions(playerPositions); // Dispatch action to update bot positions in the store.

      // --- Compute Progress for Bots ---
      // Map through bot refs to calculate and store their progress.
      const playerProgresses = playerRefs.map((ref, idx) => {
        return {
          id: idx,
          isPlayer: idx === 0,
          progress: ref.current?.userData.progress ?? 0, // Get progress from bot's userData.
        };
      });

      // Sort the combined list in descending order of progress (higher progress first).
      playerProgresses.sort((a, b) => b.progress - a.progress);

      // --- Store Sorted Progresses ---
      updateProgresses(playerProgresses); // Dispatch action to update all racers' progresses in the store.
    }
  });
}
