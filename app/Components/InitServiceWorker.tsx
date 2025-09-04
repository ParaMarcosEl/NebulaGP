'use client';

import { useEffect } from "react";

export const InitSW = () => {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker
              .register('/sw.js')
              .then((registration) => {
                console.log('Service Worker registered with scope:', registration.scope);
              })
              .catch((error) => {
                console.error('Service Worker registration failed:', error);
              });
          });
        } else {
          console.warn('Service Workers are not supported in this browser.');
        }
    }, []);
    return null;
}