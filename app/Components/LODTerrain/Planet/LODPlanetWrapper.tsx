// components/LODPlanetWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import React, { ComponentProps } from 'react';

// Dynamically import the LODPlanet component with SSR disabled
const LODPlanet = dynamic(() => import('./LODPlanet').then((mod) => mod.LODPlanet), {
  ssr: false,
});

type LODPlanetProps = ComponentProps<typeof LODPlanet>;

export const LODPlanetWrapper = (props: LODPlanetProps) => {
  return <LODPlanet {...props} />;
};
