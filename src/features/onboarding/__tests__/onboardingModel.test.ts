import { DAY } from '@/domain/time';
import {
  buildSteps,
  customNameError,
  finalizeDrafts,
  firstName,
  propagateCurrency,
  stageIndex,
  stepKey,
  syncDrafts,
  toggleKind,
  type HabitDraft,
} from '../onboardingModel';

const NOW = new Date(2026, 2, 29, 14, 43).getTime();

describe('steps', () => {
  it('builds one config page per habit', () => {
    const steps = buildSteps(2);
    expect(steps.map(stepKey)).toEqual(['welcome', 'name', 'habits', 'config-0', 'config-1', 'reminders', 'finish']);
    expect(steps.map(stageIndex)).toEqual([0, 1, 2, 3, 3, 4, 5]);
  });

  it('keeps a placeholder config page before anything is selected', () => {
    expect(buildSteps(0).map(stepKey)).toEqual(['welcome', 'name', 'habits', 'config-0', 'reminders', 'finish']);
  });
});

describe('selection', () => {
  it('toggles kinds in pick order', () => {
    let s = toggleKind([], 'alcohol');
    s = toggleKind(s, 'smoking');
    expect(s).toEqual(['alcohol', 'smoking']);
    expect(toggleKind(s, 'alcohol')).toEqual(['smoking']);
  });

  it('requires a name for the custom habit', () => {
    expect(customNameError(['smoking'], '')).toBeUndefined();
    expect(customNameError(['custom'], '  ')).toBeDefined();
    expect(customNameError(['custom'], 'x'.repeat(41))).toBeDefined();
    expect(customNameError(['custom'], 'Nail biting')).toBeUndefined();
  });
});

describe('drafts', () => {
  const opts = { currency: 'USD', now: NOW, customName: ' Nail biting ' };

  it('creates drafts from presets in selection order', () => {
    const drafts = syncDrafts(['alcohol', 'custom'], [], opts);
    expect(drafts.map((d) => d.values.kind)).toEqual(['alcohol', 'custom']);
    expect(drafts[0].values).toMatchObject({ name: 'Alcohol', cost: '12', minutes: '120', startedAt: NOW, currency: 'USD' });
    expect(drafts[1].values.name).toBe('Nail biting');
  });

  it('keeps edits for habits that stay selected and drops deselected ones', () => {
    const first = syncDrafts(['smoking', 'alcohol'], [], opts);
    const edited: HabitDraft[] = [{ values: { ...first[0].values, cost: '7' }, touched: { cost: true } }, first[1]];
    const next = syncDrafts(['smoking', 'caffeine'], edited, opts);
    expect(next.map((d) => d.values.kind)).toEqual(['smoking', 'caffeine']);
    expect(next[0].values.cost).toBe('7');
  });

  it('propagates a currency change to drafts the user has not customised', () => {
    const drafts = syncDrafts(['smoking', 'alcohol', 'caffeine'], [], opts);
    drafts[2] = { values: { ...drafts[2].values, currency: 'GBP' }, touched: { currency: true } };
    const next = propagateCurrency(drafts, 0, 'EUR');
    expect(next[0].values).toMatchObject({ currency: 'EUR', cost: '9' });
    expect(next[0].touched.currency).toBe(true);
    expect(next[1].values).toMatchObject({ currency: 'EUR', cost: '11' });
    expect(next[2].values.currency).toBe('GBP');
  });

  it('finalizes valid drafts and points at the first invalid one', () => {
    const drafts = syncDrafts(['smoking', 'alcohol'], [], { ...opts, now: NOW - DAY });
    const ok = finalizeDrafts(drafts, NOW);
    expect(ok.invalidIndex).toBeNull();
    expect(ok.outputs.map((o) => o.name)).toEqual(['Smoking', 'Alcohol']);
    const bad = [drafts[0], { ...drafts[1], values: { ...drafts[1].values, minutes: '5000' } }];
    expect(finalizeDrafts(bad, NOW)).toEqual({ outputs: [], invalidIndex: 1 });
  });
});

describe('firstName', () => {
  it('takes the first word', () => {
    expect(firstName('  Kevin Kong ')).toBe('Kevin');
    expect(firstName('')).toBe('');
  });
});
