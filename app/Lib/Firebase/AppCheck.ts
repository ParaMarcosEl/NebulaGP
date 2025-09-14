// Lib/Firebase/appCheck.ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import app from './index';

export function initAppCheck() {
  if (typeof window === 'undefined') return; // SSR safety

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true,
  });
}
