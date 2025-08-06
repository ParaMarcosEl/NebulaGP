// components/layouts/TransitionLayout.tsx
'use client';

import { useTransitions } from './TransitionController';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

type TransitionLayoutProps = {
  children:
    | ReactNode
    | ((handleRouteChange: (href: string) => (e: React.MouseEvent) => void) => ReactNode);
};

export default function TransitionLayout({ children }: TransitionLayoutProps) {
  const router = useRouter();
  const { style, triggerExit } = useTransitions({ type: 'fade' });

  const handleRouteChange = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    triggerExit(() => {
      router.push(href);
    });
  };

  return (
    <div style={style}>
      {/* You can also enhance Link with this logic */}
      {typeof children === 'function' ? children(handleRouteChange) : children}
    </div>
  );
}
