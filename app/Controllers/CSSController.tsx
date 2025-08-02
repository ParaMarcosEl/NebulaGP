// hooks/useCSSAnimation.ts
import { useEffect, useState } from 'react';
import { CSSProperties } from 'react';

type AnimationOptions = {
  type?: 'fade' | 'slide-up' | 'scale-in';
  duration?: number;
  delay?: number;
  easing?: string;
  trigger?: 'onMount' | 'manual';
};

export function useCSSAnimation({
  type = 'fade',
  duration = 800,
  delay = 0,
  easing = 'ease',
  trigger = 'onMount',
}: AnimationOptions = {}) {
  const [visible, setVisible] = useState(trigger === 'onMount' ? false : true);

  useEffect(() => {
    if (trigger === 'onMount') {
      const timeout = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timeout);
    }
  }, [trigger]);

  const baseStyle: CSSProperties = {
    transition: `all ${duration}ms ${easing} ${delay}ms`,
    opacity: visible ? 1 : 0,
  };

  const variants: Record<string, CSSProperties> = {
    fade: {},
    'slide-up': {
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
    },
    'scale-in': {
      transform: visible ? 'scale(1)' : 'scale(0.95)',
    },
  };

  const style: CSSProperties = {
    ...baseStyle,
    ...variants[type],
  };

  return {
    style,
    visible,
    setVisible,
  };
}
