import { activeMs, isPaused, pauseClock, resumeClock, seekClock, sessionSeconds, startClock, timelineMs } from '../clock';

const T0 = 1_000_000;

describe('exercise clock', () => {
  it('measures time from timestamps', () => {
    const c = startClock(T0);
    expect(activeMs(c, T0)).toBe(0);
    expect(activeMs(c, T0 + 4500)).toBe(4500);
    expect(timelineMs(c, T0 + 4500)).toBe(4500);
    // Clock skew backwards never yields negative time.
    expect(activeMs(c, T0 - 50)).toBe(0);
  });

  it('freezes while paused and accumulates pauses', () => {
    let c = startClock(T0);
    c = pauseClock(c, T0 + 3000);
    expect(isPaused(c)).toBe(true);
    expect(activeMs(c, T0 + 60_000)).toBe(3000);
    // Pausing twice keeps the first pause moment.
    expect(pauseClock(c, T0 + 9000)).toBe(c);
    c = resumeClock(c, T0 + 10_000);
    expect(isPaused(c)).toBe(false);
    expect(activeMs(c, T0 + 12_000)).toBe(5000);
    c = resumeClock(c, T0 + 13_000);
    expect(activeMs(c, T0 + 13_000)).toBe(6000);
    c = resumeClock(pauseClock(c, T0 + 14_000), T0 + 20_000);
    expect(activeMs(c, T0 + 21_000)).toBe(8000);
    expect(c.pausedMs).toBe(13_000);
  });

  it('keeps counting across backgrounding (no ticks needed)', () => {
    const c = startClock(T0);
    expect(activeMs(c, T0 + 5 * 60_000)).toBe(5 * 60_000);
  });

  it('seeks the timeline forward without inflating active time', () => {
    let c = startClock(T0);
    c = seekClock(c, T0 + 5000, 30_000);
    expect(timelineMs(c, T0 + 5000)).toBe(30_000);
    expect(activeMs(c, T0 + 5000)).toBe(5000);
    expect(timelineMs(c, T0 + 6000)).toBe(31_000);
    // Never seeks backwards.
    expect(seekClock(c, T0 + 6000, 10_000)).toBe(c);
  });

  it('computes logged seconds', () => {
    const c = startClock(T0);
    expect(sessionSeconds(c, T0 + 41_400, null)).toBe(41);
    // A timed exercise caps at the time it took to reach the end.
    expect(sessionSeconds(c, T0 + 30 * 60_000, 76_000)).toBe(76);
    const skipped = seekClock(c, T0 + 10_000, 30_000);
    expect(sessionSeconds(skipped, T0 + 10 * 60_000, 90_000)).toBe(70);
    expect(sessionSeconds(pauseClock(c, T0 + 12_000), T0 + 99_000, null)).toBe(12);
  });
});
