"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 500;

/**
 * Stat-Led hero figure — ticks from 0 to `value` over ~500ms (--dur-long).
 * prefers-reduced-motion: renders the final value immediately, no tick.
 */
export function ReserveFigure({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // final value, one frame in — no tick
      raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      // ease-out cubic: fast start, settles into the final figure
      setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{display.toLocaleString("en-US")}</span>;
}
