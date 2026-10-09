import { useEffect, useState } from 'react';

/**
 * Current time that re-renders every `intervalMs` (default 1s). Use 1000 for live
 * countdowns and something like 60_000 for screens that only show days.
 */
export function useNow(intervalMs: number = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
