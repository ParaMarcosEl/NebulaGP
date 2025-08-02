// hooks/usePageTransition.ts
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, CSSProperties } from 'react';

type AnimationType = 'fade' | 'slide-up';

export function useTransitions({
  type = 'fade',
  duration = 3000,
  easing = 'ease-in-out',
}: {
  type?: AnimationType;
  duration?: number;
  easing?: string;
}) {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const callbackRef = useRef<(() => void) | null>(null);

  const style: CSSProperties = {
    transition: `all ${duration}ms ${easing}`,
    opacity: isExiting ? 0 : 1,
    transform: type === 'slide-up' ? (isExiting ? 'translateY(10px)' : 'translateY(0)') : undefined,
  };

  const triggerExit = (callback: () => void) => {
    setIsExiting(true);
    callbackRef.current = callback;
  };

  useEffect(() => {
    if (isExiting) {
      const timeout = setTimeout(() => {
        callbackRef.current?.();
      }, duration);
      return () => clearTimeout(timeout);
    }
  }, [isExiting, duration]);

  return { style, triggerExit, router };
}
