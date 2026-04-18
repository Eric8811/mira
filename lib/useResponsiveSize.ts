"use client";

import { useEffect, useState } from "react";

/** Returns `small` when viewport is ≤ breakpointPx, otherwise `large`. SSR-safe. */
export function useResponsiveSize(small: number, large: number, breakpointPx = 640): number {
  const [size, setSize] = useState(large);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setSize(mq.matches ? small : large);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, [small, large, breakpointPx]);
  return size;
}

export function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, [breakpointPx]);
  return isMobile;
}
