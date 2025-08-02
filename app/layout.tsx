// app/layout.tsx
import Head from 'next/head';
import './globals.css';
import { isMobileDevice } from '@/Utils';
import OrientationLock from '@/Components/OrientationLock';

export const metadata = {
  title: 'Nebula GP | Anti-Gravity Racing',
  description:
    'Experience high-speed, zero-gravity races across the stars in Nebula GP. Compete, customize, and conquer the galaxy!',
  keywords: [
    'anti-gravity racing',
    'space racing game',
    'nebula GP',
    'futuristic racing',
    'racing game',
    'three.js game',
  ],
  authors: [{ name: 'Para El', url: 'https://github.com/paramarcosel' }],
  metadataBase: new URL('https://fligh-game-lake.vercel.app'), // Set to your production domain
  openGraph: {
    title: 'Nebula GP | Anti-Gravity Racing',
    description:
      'Race through galactic tracks at breakneck speeds in the ultimate zero-G racing game.',
    url: 'https://nebulagp.com',
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
  manifest: '/site.webmanifest', // optional if you're using a PWA setup
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (isMobileDevice() && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
  return (
    <html lang="en">
      <Head>
        <title>Nebula GP</title>
        <meta name="description" content="Anti-Gravity Racing" />
        <meta property="og:title" content="Nebula GP" />
        <meta property="og:description" content="Anti-Gravity Racing" />
        <meta property="og:url" content="https://flight-game-lake.vercel.app" />
        <meta property="og:type" content="website" />
      </Head>
      <body>
        {/* <TransitionLayout > */}
        {children}
        <OrientationLock />
        {/* </TransitionLayout> */}
      </body>
    </html>
  );
}
