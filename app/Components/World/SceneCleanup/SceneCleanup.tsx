import { useCleanup } from "./useCleanup";

// Add the new custom hook
export function SceneCleanup() {
  useCleanup();
  return null;
}