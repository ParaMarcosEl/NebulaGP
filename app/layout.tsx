// app/layout.tsx
import Head from 'next/head';
import './globals.css';
import OrientationLock from '@/Components/UI/OrientationLock';
import { TextureLoader } from './Components/TextureLoader/TextureLoader';
import UserProvider from './Components/UI/Auth/UserProvider';
import { SettingsInitializer } from './Controllers/Settings/SettingsInitializer';
import GlobalAlert from './Components/UI/Alert/GlobalAlert';
import { AudioUnlocker } from './Components/Audio/AudioUnlocker';
import AudioInitializer from './Components/UI/Music/AudioInitializer';
import { InitSW } from './Components/InitServiceWorker';
import CookieConsent from './Components/UI/CookieConsent/CookieConsent';
import IOSBanner from './Components/UI/IOSBanner/IOSBanner';
// import { InitAppCheck } from '@/Components/UI/Auth/InitAppCheck';

export const metadata = {
  title: 'Nebula GP | Zero-Gravity Racing',
  description:
    'Experience high-speed, zero-gravity races across the stars in Nebula GP. Compete, customize, and conquer the galaxy!',
  keywords: [
    'zero-g racing',
    'anti-gravity racing',
    'space racing game',
    'nebula GP',
    'futuristic racing',
    'racing game',
    'three.js game',
  ],
  authors: [{ name: 'Para El', url: 'https://github.com/paramarcosel' }],
  metadataBase: new URL('https://nebulagp.vercel.app'), // Set to your production domain
  openGraph: {
    title: 'Nebula GP | Zero-Gravity Racing',
    description:
      'Race through galactic tracks at breakneck speeds in the ultimate zero-G racing game.',
    url: 'https://nebulagp.vercel.app',
    siteName: 'Nebula GP',
    images: [
      {
        url: '/og-image.png', // Place an eye-catching preview image in public/
        width: 1200,
        height: 630,
        alt: 'Nebula GP Cover Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nebula GP',
    description: 'Zero-gravity racing among the stars. Can you conquer the galaxy?',
    site: '@NebulaGP', // Replace with your handle
    creator: '@ParaEl', // Replace with your handle
    images: ['/og-image.png'],
  },
  // themeColor: '#000000',
  manifest: '/manifest.json', // optional if you're using a PWA setup
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // if (typeof window !== 'undefined' && document.documentElement.requestFullscreen) {
  //   document.documentElement.requestFullscreen();
  // }

  return (
    <html lang="en">
      <Head>
        <title>Nebula GP</title>
        <meta name="description" content="Zero-Gravity Racing" />
        <meta property="og:title" content="Nebula GP" />
        <meta property="og:description" content="Zero-Gravity Racing" />
        <meta property="og:url" content="https://nebulagp.vercel.app" />
        <meta property="og:type" content="website" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <meta name="apple-mobile-web-app-title" content="NebulaGP" />

        <link rel="apple-touch-icon" href="/icons/nebula_logo192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/nebula_logo512.png" />

      </Head>
      <body>
        {/* <TransitionLayout > */}
        <TextureLoader
          textures={[
            '/textures/explosion.png',
            '/textures/clouds.png',
            '/textures/particle.png',
            '/textures/planet_texture01.png',
            '/textures/planet_texture02.png',
            '/textures/planet_texture03.png',
            '/textures/stage_texture.png',
            '/textures/sunsurface.png',
          ]}
        />
        <UserProvider>
          <AudioInitializer />
          {children}
          <SettingsInitializer />
          <GlobalAlert />
        </UserProvider>
        <IOSBanner />
        <OrientationLock />
        <AudioUnlocker />
        <InitSW />
        <CookieConsent />
        {/* <InitAppCheck /> */}
        {/* </TransitionLayout> */}
      </body>
    </html>
  );
}
