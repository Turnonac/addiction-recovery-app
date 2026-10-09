import { BODY_REGIONS, COLD_STEPS, MEDITATION_PROMPTS, TAPE_CARDS, WAIT_MESSAGES } from '../../content';
import {
  PATTERN_478,
  PATTERN_BOX,
  boxPoint,
  breathScale,
  breathTargetScale,
  breathingPhaseAt,
  cycleMs,
  exerciseTimelineMs,
  formatClock,
  formatCountdown,
  formatSpoken,
  patternTotalMs,
  rotatingIndex,
  secondsLeft,
  segmentAt,
  segmentStart,
  segmentsTotal,
} from '../timeline';

describe('breathingPhaseAt', () => {
  it('walks the 4-7-8 pattern', () => {
    expect(cycleMs(PATTERN_478)).toBe(19_000);
    expect(patternTotalMs(PATTERN_478)).toBe(76_000);

    const start = breathingPhaseAt(PATTERN_478, 0);
    expect(start).toMatchObject({ phaseIndex: 0, cycle: 1, phaseRemainingMs: 4000, done: false });
    expect(start.phase.label).toBe('Breathe in');

    const hold = breathingPhaseAt(PATTERN_478, 4000);
    expect(hold).toMatchObject({ phaseIndex: 1, cycle: 1, phaseElapsedMs: 0, phaseRemainingMs: 7000 });
    expect(hold.phase.kind).toBe('hold');

    const out = breathingPhaseAt(PATTERN_478, 15_500);
    expect(out).toMatchObject({ phaseIndex: 2, cycle: 1, phaseElapsedMs: 4500, phaseRemainingMs: 3500 });

    const c2 = breathingPhaseAt(PATTERN_478, 19_000 + 1000);
    expect(c2).toMatchObject({ phaseIndex: 0, cycle: 2, phaseRemainingMs: 3000 });
    expect(c2.phaseProgress).toBeCloseTo(0.25);

    const lastMoment = breathingPhaseAt(PATTERN_478, 75_999);
    expect(lastMoment).toMatchObject({ phaseIndex: 2, cycle: 4, done: false });
  });

  it('finishes after the last cycle and clamps negatives', () => {
    expect(breathingPhaseAt(PATTERN_478, 76_000)).toMatchObject({ done: true, cycle: 4, phaseIndex: 2, phaseRemainingMs: 0 });
    expect(breathingPhaseAt(PATTERN_478, 500_000).done).toBe(true);
    expect(breathingPhaseAt(PATTERN_478, -10)).toMatchObject({ phaseIndex: 0, cycle: 1, done: false });
  });

  it('walks the box pattern edge by edge', () => {
    expect(patternTotalMs(PATTERN_BOX)).toBe(64_000);
    expect(breathingPhaseAt(PATTERN_BOX, 12_100).phase.kind).toBe('rest');
    expect(breathingPhaseAt(PATTERN_BOX, 16_000)).toMatchObject({ phaseIndex: 0, cycle: 2 });
    expect(breathingPhaseAt(PATTERN_BOX, 63_000)).toMatchObject({ phaseIndex: 3, cycle: 4, phaseRemainingMs: 1000 });
  });
});

describe('breath scale', () => {
  it('grows on inhale, holds, shrinks on exhale', () => {
    expect(breathScale('in', 0)).toBeCloseTo(0.6);
    expect(breathScale('in', 0.5)).toBeCloseTo(0.8);
    expect(breathScale('in', 1)).toBeCloseTo(1);
    expect(breathScale('hold', 0.3)).toBe(1);
    expect(breathScale('out', 1)).toBeCloseTo(0.6);
    expect(breathScale('rest', 0.5)).toBe(0.6);
    expect(breathTargetScale('in')).toBe(1);
    expect(breathTargetScale('out')).toBe(0.6);
    expect(breathTargetScale('rest')).toBe(0.6);
  });
});

describe('boxPoint', () => {
  it('travels around the square', () => {
    expect(boxPoint(0)).toEqual({ x: 0, y: 1 });
    expect(boxPoint(0.5)).toEqual({ x: 0, y: 0.5 });
    expect(boxPoint(1)).toEqual({ x: 0, y: 0 });
    expect(boxPoint(1.25)).toEqual({ x: 0.25, y: 0 });
    expect(boxPoint(2)).toEqual({ x: 1, y: 0 });
    expect(boxPoint(2.5)).toEqual({ x: 1, y: 0.5 });
    expect(boxPoint(3.5)).toEqual({ x: 0.5, y: 1 });
    expect(boxPoint(4)).toEqual({ x: 0, y: 1 });
    expect(boxPoint(-1)).toEqual({ x: 0, y: 1 });
  });
});

describe('segmentAt', () => {
  const d = [20_000, 20_000, 30_000];
  it('finds the active segment', () => {
    expect(segmentsTotal(d)).toBe(70_000);
    expect(segmentStart(d, 2)).toBe(40_000);
    expect(segmentAt(d, 0)).toMatchObject({ index: 0, remainingMs: 20_000, done: false });
    expect(segmentAt(d, 25_000)).toMatchObject({ index: 1, elapsedInMs: 5000, remainingMs: 15_000 });
    expect(segmentAt(d, 25_000).progress).toBeCloseTo(0.25);
    expect(segmentAt(d, 69_999)).toMatchObject({ index: 2, done: false });
    expect(segmentAt(d, 70_000)).toMatchObject({ index: 2, done: true, remainingMs: 0 });
    expect(segmentAt([], 10)).toMatchObject({ index: 0, done: true });
  });

  it('rotates messages', () => {
    expect(rotatingIndex(0, 30_000, 12)).toBe(0);
    expect(rotatingIndex(29_999, 30_000, 12)).toBe(0);
    expect(rotatingIndex(30_000, 30_000, 12)).toBe(1);
    expect(rotatingIndex(12 * 30_000, 30_000, 12)).toBe(0);
    expect(rotatingIndex(100, 0, 3)).toBe(0);
    expect(rotatingIndex(100, 10, 0)).toBe(0);
  });
});

describe('exercise timelines + content', () => {
  it('has the planned lengths', () => {
    expect(exerciseTimelineMs('breathing_478')).toBe(76_000);
    expect(exerciseTimelineMs('box_breathing')).toBe(64_000);
    expect(exerciseTimelineMs('wait_it_out')).toBe(600_000);
    expect(exerciseTimelineMs('body_scan')).toBe(180_000);
    expect(exerciseTimelineMs('meditation_1min')).toBe(60_000);
    expect(exerciseTimelineMs('cold_water')).toBe(90_000);
    expect(exerciseTimelineMs('grounding_54321')).toBeNull();
    expect(exerciseTimelineMs('play_tape_forward')).toBeNull();
  });

  it('ships enough distinct guidance', () => {
    expect(new Set(WAIT_MESSAGES).size).toBeGreaterThanOrEqual(12);
    expect(new Set(WAIT_MESSAGES).size).toBe(WAIT_MESSAGES.length);
    expect(MEDITATION_PROMPTS).toHaveLength(4);
    expect(BODY_REGIONS.map((r) => r.id)).toEqual(['feet', 'legs', 'hips', 'belly', 'chest', 'hands', 'shoulders', 'jaw', 'forehead']);
    expect(COLD_STEPS).toHaveLength(3);
    expect(TAPE_CARDS.length).toBeGreaterThanOrEqual(6);
  });
});

describe('formatting', () => {
  it('formats clocks', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_900)).toBe('1:05');
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatCountdown(599_001)).toBe('10:00');
    expect(formatCountdown(59_000)).toBe('0:59');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5)).toBe('0:00');
    expect(secondsLeft(3001)).toBe(4);
    expect(secondsLeft(3000)).toBe(3);
    expect(secondsLeft(-1)).toBe(0);
  });

  it('speaks durations', () => {
    expect(formatSpoken(45)).toBe('45 sec');
    expect(formatSpoken(76)).toBe('1 min 16 sec');
    expect(formatSpoken(600)).toBe('10 min');
    expect(formatSpoken(5)).toBe('5 sec');
    expect(formatSpoken(3)).toBe('a few seconds');
    expect(formatSpoken(-3)).toBe('a few seconds');
  });
});
