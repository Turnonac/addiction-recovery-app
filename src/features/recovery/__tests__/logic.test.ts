import { DAY, HOUR, MINUTE, MONTH, WEEK, YEAR } from '@/domain/time';
import { getBrainProfile } from '@/domain/catalog/brain';
import {
  approxDays,
  brainCardSubtitle,
  closeRegionPanel,
  daysToGoLabel,
  keepTailTogether,
  milestoneTimeLabel,
  needsYear,
  NO_REGION_SELECTION,
  percentInt,
  recoveryEtaLabel,
  regionViews,
  tapRegionMarker,
  tapRegionRow,
  timelineState,
} from '../logic';

describe('timelineState', () => {
  it('splits rows into achieved / current / upcoming', () => {
    expect([0, 1, 2, 3].map((i) => timelineState(i, 2))).toEqual(['achieved', 'achieved', 'current', 'upcoming']);
    expect(timelineState(0, 0)).toBe('current');
    expect(timelineState(2, 3)).toBe('achieved');
  });
});

describe('milestoneTimeLabel', () => {
  it('formats the common spans', () => {
    expect(milestoneTimeLabel(20 * MINUTE)).toBe('20 MIN');
    expect(milestoneTimeLabel(30 * 1000)).toBe('1 MIN');
    expect(milestoneTimeLabel(HOUR)).toBe('1 HOUR');
    expect(milestoneTimeLabel(8 * HOUR)).toBe('8 HOURS');
    expect(milestoneTimeLabel(DAY)).toBe('1 DAY');
    expect(milestoneTimeLabel(3 * DAY)).toBe('3 DAYS');
    expect(milestoneTimeLabel(WEEK)).toBe('1 WEEK');
    expect(milestoneTimeLabel(2 * WEEK)).toBe('2 WEEKS');
    expect(milestoneTimeLabel(12 * WEEK)).toBe('12 WEEKS');
    expect(milestoneTimeLabel(9 * DAY)).toBe('9 DAYS');
    expect(milestoneTimeLabel(66 * DAY)).toBe('66 DAYS');
    expect(milestoneTimeLabel(MONTH)).toBe('1 MONTH');
    expect(milestoneTimeLabel(9 * MONTH)).toBe('9 MONTHS');
    expect(milestoneTimeLabel(YEAR)).toBe('1 YEAR');
    expect(milestoneTimeLabel(15 * YEAR)).toBe('15 YEARS');
  });
});

describe('recoveryEtaLabel', () => {
  it('shows the total recovery time like the reference ("Recovered in ~84 days")', () => {
    expect(recoveryEtaLabel({ fullRecoveryDays: 84, daysLeft: 55 })).toBe('Recovered in ~84 days');
    expect(recoveryEtaLabel({ fullRecoveryDays: 270, daysLeft: 241 })).toBe('Recovered in ~9 months');
    expect(recoveryEtaLabel({ fullRecoveryDays: 365, daysLeft: 300 })).toBe('Recovered in ~1 year');
    expect(recoveryEtaLabel({ fullRecoveryDays: 1, daysLeft: 1 })).toBe('Recovered in ~1 day');
  });

  it('says "Fully recovered" at 100%', () => {
    expect(recoveryEtaLabel({ fullRecoveryDays: 7, daysLeft: 0 })).toBe('Fully recovered');
    expect(recoveryEtaLabel({ fullRecoveryDays: 7, daysLeft: -3 })).toBe('Fully recovered');
  });

  it('matches the reference smoking screen at day 29', () => {
    const nach = regionViews(getBrainProfile('smoking').regions, 29.2).find((v) => v.id === 'nach')!;
    expect(percentInt(nach.recovery)).toBe(65);
    expect(recoveryEtaLabel(nach)).toBe('Recovered in ~84 days');
    expect(daysToGoLabel(nach.daysLeft)).toBe('~55 days to go');
  });
});

describe('approxDays + daysToGoLabel', () => {
  it('rounds long spans to months and years', () => {
    expect(approxDays(0.2)).toBe('1 day');
    expect(approxDays(55)).toBe('55 days');
    expect(approxDays(119)).toBe('119 days');
    expect(approxDays(120)).toBe('4 months');
    expect(approxDays(241)).toBe('8 months');
    expect(approxDays(330)).toBe('11 months');
    expect(approxDays(400)).toBe('1 year');
    expect(approxDays(730)).toBe('2 years');
  });

  it('never says "12 months": spans that round to 12 months read as a year', () => {
    expect(approxDays(344)).toBe('11 months');
    expect(approxDays(345)).toBe('1 year');
    expect(approxDays(355)).toBe('1 year');
    expect(approxDays(364)).toBe('1 year');
    expect(approxDays(365)).toBe('1 year');
    for (let d = 1; d <= 800; d++) expect(approxDays(d)).not.toMatch(/^12 months$/);
  });

  it('is empty once recovered', () => {
    expect(daysToGoLabel(0)).toBe('');
    expect(daysToGoLabel(-2)).toBe('');
  });

  it('counts the time left in days under a year', () => {
    expect(daysToGoLabel(1)).toBe('~1 day to go');
    expect(daysToGoLabel(0.3)).toBe('~1 day to go');
    expect(daysToGoLabel(55)).toBe('~55 days to go');
    expect(daysToGoLabel(241)).toBe('~241 days to go');
    expect(daysToGoLabel(355)).toBe('~355 days to go');
    expect(daysToGoLabel(400)).toBe('~1 year to go');
  });

  it('never repeats the total early on (alcohol, day 10)', () => {
    const views = regionViews(getBrainProfile('alcohol').regions, 10.2);
    const byId = Object.fromEntries(views.map((v) => [v.id, `${recoveryEtaLabel(v)} · ${daysToGoLabel(v.daysLeft)}`]));
    expect(byId.prefrontal).toBe('Recovered in ~1 year · ~355 days to go');
    expect(byId.cerebellum).toBe('Recovered in ~1 year · ~355 days to go');
    expect(byId.hippocampus).toBe('Recovered in ~6 months · ~170 days to go');
    for (const v of views) {
      expect(daysToGoLabel(v.daysLeft)).not.toBe(`~${recoveryEtaLabel(v).replace('Recovered in ~', '')} to go`);
    }
  });
});

describe('keepTailTogether', () => {
  it('joins the last two words with a no-break space', () => {
    expect(keepTailTogether('Recovered in ~60 days')).toBe('Recovered in ~60\u00A0days');
    expect(keepTailTogether('Fully recovered')).toBe('Fully\u00A0recovered');
    expect(keepTailTogether('Recovered')).toBe('Recovered');
    expect(keepTailTogether('')).toBe('');
  });
});

describe('brainCardSubtitle', () => {
  it('summarizes the systems', () => {
    expect(brainCardSubtitle({ overall: 0.68, recovered: 2, recovering: 3, total: 5 })).toBe('3 of 5 systems recovering');
    expect(brainCardSubtitle({ overall: 1, recovered: 4, recovering: 0, total: 4 })).toBe('All 4 systems recovered');
    expect(brainCardSubtitle({ overall: 0.2, recovered: 0, recovering: 4, total: 4 })).toBe('All 4 systems recovering');
    expect(brainCardSubtitle({ overall: 0, recovered: 0, recovering: 4, total: 4 })).toBe('Recovery starts now');
  });

  it('agrees with the ring: anything that rounds down to 0% has not started yet', () => {
    expect(brainCardSubtitle({ overall: 0.004, recovered: 0, recovering: 5, total: 5 })).toBe('Recovery starts now');
    expect(brainCardSubtitle({ overall: 0.0099, recovered: 0, recovering: 5, total: 5 })).toBe('Recovery starts now');
    expect(brainCardSubtitle({ overall: 0.01, recovered: 0, recovering: 5, total: 5 })).toBe('All 5 systems recovering');
  });
});

describe('helpers', () => {
  it('floors percentages', () => {
    expect(percentInt(0.999)).toBe(99);
    expect(percentInt(1.2)).toBe(100);
    expect(percentInt(-1)).toBe(0);
  });

  it('detects dates outside the current year', () => {
    const now = new Date(2026, 9, 9).getTime();
    expect(needsYear(new Date(2026, 0, 1).getTime(), now)).toBe(false);
    expect(needsYear(new Date(2025, 11, 31).getTime(), now)).toBe(true);
  });
});

describe('regionViews', () => {
  it('adds recovery and days left to each region', () => {
    const views = regionViews(getBrainProfile('smoking').regions, 29.2);
    expect(views).toHaveLength(5);
    const nach = views.find((v) => v.id === 'nach')!;
    expect(percentInt(nach.recovery)).toBe(65);
    expect(nach.daysLeft).toBe(55);
    const blood = views.find((v) => v.id === 'bloodFlow')!;
    expect(blood.recovery).toBe(1);
    expect(blood.daysLeft).toBe(0);
  });

  it('never reports 0 days left for a region that is not fully recovered', () => {
    const [v] = regionViews([{ ...getBrainProfile('custom').regions[0], fullRecoveryDays: 10 }], 9.9999);
    expect(v.recovery).toBeLessThan(1);
    expect(v.daysLeft).toBe(1);
  });
});

describe('region selection', () => {
  it('a row tap expands that row and highlights its marker without opening the panel', () => {
    const s = tapRegionRow(NO_REGION_SELECTION, 'nach');
    expect(s).toEqual({ selectedId: 'nach', panelId: null, expanded: ['nach'] });
    expect(tapRegionRow(s, 'nach')).toEqual(NO_REGION_SELECTION);
  });

  it('a marker tap opens the panel and collapses that row so the description shows once', () => {
    let s = tapRegionRow(NO_REGION_SELECTION, 'nach');
    s = tapRegionRow(s, 'sleep');
    s = tapRegionMarker(s, 'nach');
    expect(s).toEqual({ selectedId: 'nach', panelId: 'nach', expanded: ['sleep'] });
    expect(tapRegionMarker(s, 'nach')).toEqual({ selectedId: null, panelId: null, expanded: ['sleep'] });
  });

  it('expanding a row closes the panel; collapsing another row leaves it alone', () => {
    let s = tapRegionMarker(tapRegionRow(NO_REGION_SELECTION, 'sleep'), 'nach');
    expect(tapRegionRow(s, 'sleep')).toEqual({ selectedId: 'nach', panelId: 'nach', expanded: [] });
    s = tapRegionRow(s, 'dopamine');
    expect(s).toEqual({ selectedId: 'dopamine', panelId: null, expanded: ['sleep', 'dopamine'] });
  });

  it('never shows a description in both places', () => {
    const ids = ['a', 'b', 'c'];
    let s = NO_REGION_SELECTION;
    for (let i = 0; i < 200; i++) {
      const id = ids[(i * 7) % 3];
      s = i % 5 === 4 ? closeRegionPanel(s) : (i * 13) % 3 === 0 ? tapRegionMarker(s, id) : tapRegionRow(s, id);
      if (s.panelId) {
        expect(s.expanded).not.toContain(s.panelId);
        expect(s.selectedId).toBe(s.panelId);
      }
    }
  });

  it('closing the panel clears its highlight', () => {
    expect(closeRegionPanel(tapRegionMarker(NO_REGION_SELECTION, 'nach'))).toEqual(NO_REGION_SELECTION);
  });
});
