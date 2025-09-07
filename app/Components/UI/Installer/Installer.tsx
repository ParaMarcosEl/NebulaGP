'use client';
import { useAlertStore } from '@/Controllers/Alert/useAlertStore';
import { useEffect, useState } from 'react';

// Define a type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { setAlert } = useAlertStore((s) => s);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setAlert({ type: 'info', message: `Installation ${choice.outcome}` });
    console.log(`User ${choice.outcome} the installation`);
    setDeferredPrompt(null);
  };

  return (
    <button onClick={handleInstall} disabled={!deferredPrompt}>
      Install
    </button>
  );
}
