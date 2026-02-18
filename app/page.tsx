'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFullscreen } from '@/Controllers/UI/useFullscreen';
import { useCanvasLoader } from './Components/UI/Loader/CanvasLoader';
import NavBar from './Components/UI/Navigation/NavBar';
import AuthForm from './Components/UI/Auth/AuthForm';
import AuthGuard from './Components/UI/Auth/AuthGaurd';
import { useUserStore } from './Controllers/Users/useUserStore';
import Modal from './Components/UI/Modal/Modal';
import Leaderboard from './Components/UI/Leaderboard/Leaderboard';
import Dashboard from './Components/UI/Dashboard/Dashboard';
import { useIntroGateStore } from './Controllers/UI/useIntroGateStore';
import './page.css';

const GameCanvas = dynamic(() => import('./Components/GameCanvas'), {
  ssr: false,
  loading: () => <div className="canvas-loading" aria-hidden="true" />,
});

const canUseIdleCallback = () => typeof window !== 'undefined' && 'requestIdleCallback' in window;

const preloadGameCanvas = () => import('./Components/GameCanvas');

export default function Home() {
  useFullscreen();
  const [leaderboard1, setLeaderboard1] = useState(false);
  const [leaderboard1tt, setLeaderboard1tt] = useState(false);

  const uiContainerRef = useRef<HTMLDivElement>(null);
  const stageSelectRef = useRef<HTMLElement>(null);
  const dashboardRef = useRef<HTMLElement>(null);

  const { loader } = useCanvasLoader();
  const { user } = useUserStore((s) => s);
  const { audioPromptVisible, audioPromptResolved } = useIntroGateStore((s) => s);

  useEffect(() => {
    if (!audioPromptVisible) return;

    let cleanup = () => {};

    if (canUseIdleCallback()) {
      const idleId = window.requestIdleCallback(() => {
        void preloadGameCanvas();
      });

      cleanup = () => window.cancelIdleCallback(idleId);
    } else {
      const timeoutId = window.setTimeout(() => {
        void preloadGameCanvas();
      }, 150);

      cleanup = () => window.clearTimeout(timeoutId);
    }

    return cleanup;
  }, [audioPromptVisible]);

  return (
    <>
      {loader}
      {audioPromptResolved && (
        <Suspense fallback={<div className="canvas-loading" aria-hidden="true" />}>
          <GameCanvas
            uiContainerRef={uiContainerRef as React.RefObject<HTMLDivElement>}
            dashboardRef={dashboardRef as React.RefObject<HTMLDivElement>}
            stageSelectRef={stageSelectRef as React.RefObject<HTMLDivElement>}
          />
        </Suspense>
      )}

      <main className="main">
        <NavBar uiContainerRef={uiContainerRef as React.RefObject<HTMLElement>} />
        <div ref={uiContainerRef} className="ui-container">
          <section ref={dashboardRef} className="section">
            <h1 className="heading">Zero-Gravity Racing</h1>

            <button
              className="link play"
              onClick={() => {
                if (stageSelectRef.current && uiContainerRef.current)
                  uiContainerRef.current.scrollTo({
                    top: stageSelectRef.current.offsetTop,
                    behavior: 'smooth',
                  });
              }}
            >
              Play Game
            </button>

            <AuthGuard fallback={<AuthForm mode="login" />}>
              {user?.email && <Dashboard />}
            </AuthGuard>
          </section>

          <section ref={stageSelectRef} className="section">
            <h1 className="stage-select-heading">Select Stage</h1>

            <div>
              <div>
                <span>Stage 1</span>
                <Link href="/stages/stage1" className="stage-select-link">
                  Race
                </Link>
                <button onClick={() => setLeaderboard1(true)}>Leaderboard</button>
                <Link href="/stages/stage1/time-trial" className="stage-select-link">
                  Time Trial
                </Link>
                <button onClick={() => setLeaderboard1tt(true)}>Leaderboard</button>
              </div>
            </div>
          </section>

          <Modal isOpen={leaderboard1} onClose={() => setLeaderboard1(false)}>
            <Leaderboard trackId="/stages/stage1" />
          </Modal>

          <Modal isOpen={leaderboard1tt} onClose={() => setLeaderboard1tt(false)}>
            <Leaderboard trackId="/stages/stage1/time-trial" />
          </Modal>
        </div>
      </main>
    </>
  );
}
