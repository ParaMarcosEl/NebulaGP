import { useFrame } from "@react-three/fiber"
import { useRef } from "react"

// In your custom useFixedFrame hook
import { RootState } from "@react-three/fiber"

export function useFixedFrame(
  callback: (state: RootState, fixedStep: number) => void,
  fixedStep = 1 / 120,
  maxSteps = 5
) {
  const accumulator = useRef(0)

  useFrame((state, delta) => {
    // Expose accumulator to the global state or a shared context if needed.
    accumulator.current += delta

    let steps = 0
    while (accumulator.current >= fixedStep && steps < maxSteps) {
      callback(state, fixedStep)
      accumulator.current -= fixedStep
      steps++
    }
  })

  return accumulator // Return the ref so it can be used by other components
}