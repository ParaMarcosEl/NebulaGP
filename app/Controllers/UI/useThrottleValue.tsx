'use client';
import { useEffect, useRef, useState } from "react";

// -------------------------
// Helper: throttle hook for values that update fast
// This returns a stable value that only updates at most `fps` times per second
// -------------------------
export function useThrottledValue<T>(value: T, fps = 10) {
    const [throttled, setThrottled] = useState(value);
    const last = useRef(value);
    useEffect(() => {
        last.current = value;
    }, [value]);

    useEffect(() => {
        let mounted = true;
        const interval = 1000 / fps;
        const id = setInterval(() => {
            if (!mounted) return;
            // shallow compare reference -- replace with custom comparator if needed
            if (last.current !== throttled) setThrottled(last.current as T);
        }, interval);
        return () => {
            mounted = false;
            clearInterval(id);
        };
    }, [fps, throttled]);

    return throttled;
}