import { DAY, HOUR } from '@/domain/time';
import type { Habit, JournalEntry, MoodId } from '@/types';
import {
  DERIVED_TITLE_MAX,
  EMPTY_FILTER,
  TITLE_MAX,
  averageMood,
  blankDraft,
  canSave,
  deriveTitle,
  draftFromEntry,
  draftToInput,
  editorHref,
  entryCountLabel,
  filterEntries,
  firstParam,
  groupByDay,
  habitOptions,
  insertPrompt,
  isDraftDirty,
  isFilterActive,
  linkedHabits,
  matchesQuery,
  moodForScore,
  moodStrip,
  pickerRingSize,
  previewText,
  sortNewestFirst,
  stripDotSize,
  titleCounter,
  truncateAtWord,
  validateDraft,
  wordCount,
} from '../logic';

/** Local-time timestamp (month is 1-based for readability). */
function at(y: number, m: number, d: number, h = 12, min = 0): number {
  return new Date(y, m - 1, d, h, min).getTime();
}

function entry(id: string, createdAt: number, mood: MoodId = 'sunny', extra: Partial<JournalEntry> = {}): JournalEntry {
  return { id, createdAt, updatedAt: createdAt, title: `Title ${id}`, body: `Body ${id}`, mood, habitId: null, ...extra };
}

function habit(id: string, order: number, archived = false): Habit {
  return {
    id,
    kind: 'custom',
    name: id,
    color: '#EF4444',
    icon: 'star',
    startedAt: 0,
    firstStartedAt: 0,
    createdAt: 0,
    dailyCost: 0,
    currency: 'USD',
    dailyMinutes: 0,
    goalDays: null,
    reason: '',
    archived,
    order,
  };
}

describe('sortNewestFirst / groupByDay', () => {
  const entries = [
    entry('a', at(2026, 3, 25, 12, 48)),
    entry('b', at(2026, 3, 29, 14, 43)),
    entry('c', at(2026, 3, 25, 14, 11)),
    entry('d', at(2026, 3, 26, 1, 0)),
  ];

  it('sorts newest first without mutating the input', () => {
    const copy = [...entries];
    expect(sortNewestFirst(entries).map((e) => e.id)).toEqual(['b', 'd', 'c', 'a']);
    expect(entries).toEqual(copy);
  });

  it('breaks createdAt ties by updatedAt', () => {
    const t = at(2026, 3, 1);
    const list = [entry('x', t, 'sunny', { updatedAt: t }), entry('y', t, 'sunny', { updatedAt: t + 5 })];
    expect(sortNewestFirst(list).map((e) => e.id)).toEqual(['y', 'x']);
  });

  it('groups by local day with date labels, newest day first', () => {
    const groups = groupByDay(entries);
    expect(groups.map((g) => g.label)).toEqual(['29 Mar 2026', '26 Mar 2026', '25 Mar 2026']);
    expect(groups[2].data.map((e) => e.id)).toEqual(['c', 'a']);
    expect(groups[0].dayStart).toBe(at(2026, 3, 29, 0, 0));
    expect(new Set(groups.map((g) => g.key)).size).toBe(3);
  });

  it('puts entries just before and after midnight in different days', () => {
    const groups = groupByDay([entry('late', at(2026, 3, 25, 23, 59)), entry('early', at(2026, 3, 26, 0, 1))]);
    expect(groups).toHaveLength(2);
  });

  it('returns no groups for no entries', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('filtering', () => {
  const list = [
    entry('1', at(2026, 3, 1), 'stormy', { title: 'I started smoking again', body: 'Bad day at work.', habitId: 'h1' }),
    entry('2', at(2026, 3, 2), 'sunny', { title: 'A walk', body: 'Felt calm. Coffee helped.', habitId: null }),
    entry('3', at(2026, 3, 3), 'stormy', { title: 'Party', body: 'Everyone was SMOKING outside.', habitId: 'h2' }),
  ];

  it('matches every query token in title or body, case-insensitively', () => {
    expect(matchesQuery(list[0], 'smoking')).toBe(true);
    expect(matchesQuery(list[2], 'smoking outside')).toBe(true);
    expect(matchesQuery(list[2], 'smoking inside')).toBe(false);
    expect(matchesQuery(list[1], '   ')).toBe(true);
  });

  it('combines mood, habit and query', () => {
    expect(filterEntries(list, EMPTY_FILTER).map((e) => e.id)).toEqual(['1', '2', '3']);
    expect(filterEntries(list, { ...EMPTY_FILTER, mood: 'stormy' }).map((e) => e.id)).toEqual(['1', '3']);
    expect(filterEntries(list, { ...EMPTY_FILTER, habitId: 'h2' }).map((e) => e.id)).toEqual(['3']);
    expect(filterEntries(list, { mood: 'stormy', habitId: null, query: 'smoking' }).map((e) => e.id)).toEqual(['1', '3']);
    expect(filterEntries(list, { mood: 'sunny', habitId: 'h1', query: '' })).toEqual([]);
  });

  it('knows when a filter is active', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, query: '  ' })).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, query: 'x' })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, mood: 'star' })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, habitId: 'h1' })).toBe(true);
  });

  it('lists linked habits active-first in home order', () => {
    const habits = [habit('h3', 0), habit('h2', 2, true), habit('h1', 1)];
    expect(linkedHabits(habits, list).map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(linkedHabits(habits, [])).toEqual([]);
  });

  it('offers active habits plus an archived selected one in the editor', () => {
    const habits = [habit('b', 1), habit('arch', 0, true), habit('a', 0)];
    expect(habitOptions(habits, null).map((h) => h.id)).toEqual(['a', 'b']);
    expect(habitOptions(habits, 'arch').map((h) => h.id)).toEqual(['a', 'b', 'arch']);
  });
});

describe('mood', () => {
  it('maps scores to the nearest mood', () => {
    expect(moodForScore(1).id).toBe('stormy');
    expect(moodForScore(2.49).id).toBe('cloudy');
    expect(moodForScore(2.5).id).toBe('sunny');
    expect(moodForScore(4.6).id).toBe('star');
    expect(moodForScore(0).id).toBe('stormy');
    expect(moodForScore(9).id).toBe('star');
  });

  it('averages entries', () => {
    expect(averageMood([])).toBeNull();
    const avg = averageMood([entry('a', 0, 'stormy'), entry('b', 0, 'sparkle'), entry('c', 0, 'sunny')]);
    expect(avg?.score).toBeCloseTo(8 / 3);
    expect(avg?.mood.label).toBe('Okay');
    expect(avg?.count).toBe(3);
  });

  it('builds a 14-day strip ending today, oldest first', () => {
    const now = at(2026, 3, 29, 18, 0);
    const strip = moodStrip(
      [
        entry('today', at(2026, 3, 29, 9), 'star'),
        entry('y1', at(2026, 3, 28, 9), 'stormy'),
        entry('y2', at(2026, 3, 28, 20), 'sparkle'),
        entry('old', at(2026, 3, 1, 9), 'star'),
      ],
      now,
    );
    expect(strip).toHaveLength(14);
    expect(strip[0].dayStart).toBe(at(2026, 3, 16, 0, 0));
    expect(strip[13]).toEqual({ dayStart: at(2026, 3, 29, 0, 0), mood: 'star', count: 1, isToday: true });
    // stormy (1) + good (4) -> 2.5 -> Okay
    expect(strip[12]).toMatchObject({ mood: 'sunny', count: 2, isToday: false });
    expect(strip.slice(0, 12).every((d) => d.mood === null && d.count === 0)).toBe(true);
  });

  it('supports a custom strip length', () => {
    expect(moodStrip([], at(2026, 1, 1), 7)).toHaveLength(7);
  });
});

describe('text helpers', () => {
  it('derives the title from the first non-empty body line', () => {
    expect(deriveTitle('  My title ', 'body')).toBe('My title');
    expect(deriveTitle('', '\n\n  Short first line \nsecond')).toBe('Short first line');
    expect(deriveTitle('', '')).toBe('');
  });

  it('truncates derived titles at a word boundary within the limit', () => {
    const body = 'Today I walked past the shop where I used to buy cigarettes and kept going';
    const title = deriveTitle('', body);
    expect(title.length).toBeLessThanOrEqual(DERIVED_TITLE_MAX);
    expect(title.endsWith('…')).toBe(true);
    expect(body.startsWith(title.slice(0, -1))).toBe(true);
    expect(title).toBe('Today I walked past the shop where I…');
  });

  it('hard-cuts a single long word', () => {
    const t = truncateAtWord('a'.repeat(60), 40);
    expect(t).toHaveLength(40);
    expect(t.endsWith('…')).toBe(true);
  });

  it('collapses whitespace for previews', () => {
    expect(previewText('Line one\n\n  line   two ')).toBe('Line one line two');
  });

  it('inserts prompts as a new paragraph', () => {
    expect(insertPrompt('', 'What am I proud of today?')).toBe('What am I proud of today?\n');
    expect(insertPrompt('I felt ok.  \n', 'Q?')).toBe('I felt ok.\n\nQ?\n');
  });

  it('counts words and entries', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('  one two\nthree ')).toBe(3);
    expect(entryCountLabel(1)).toBe('1 entry');
    expect(entryCountLabel(0)).toBe('0 entries');
    expect(entryCountLabel(6)).toBe('6 entries');
  });

  it('shows a title counter only near the limit', () => {
    expect(titleCounter('')).toBeUndefined();
    expect(titleCounter('x'.repeat(59))).toBeUndefined();
    expect(titleCounter('x'.repeat(60))).toBe(`60/${TITLE_MAX}`);
    expect(titleCounter('x'.repeat(TITLE_MAX))).toBe(`${TITLE_MAX}/${TITLE_MAX}`);
  });
});

describe('layout', () => {
  it('fits 14 strip dots in narrow cards', () => {
    expect(stripDotSize(0)).toBe(22);
    expect(stripDotSize(326)).toBe(22); // 390pt screen
    expect(stripDotSize(296)).toBe(20); // 360dp
    expect(stripDotSize(256)).toBe(17); // 320pt
    expect(stripDotSize(256) * 14).toBeLessThanOrEqual(256);
    expect(stripDotSize(100)).toBe(12);
  });

  it('shrinks mood rings so the scaled-up selection still fits', () => {
    expect(pickerRingSize(0, 5, 60, 1.1)).toBe(60);
    expect(pickerRingSize(358, 5, 60, 1.1)).toBe(60); // 390pt
    expect(pickerRingSize(288, 5, 60, 1.1)).toBe(52); // 320pt
    expect(pickerRingSize(288, 5, 60, 1.1) * 1.1 * 5).toBeLessThanOrEqual(288);
    expect(pickerRingSize(150, 5, 60, 1.1)).toBe(44);
  });
});

describe('draft', () => {
  const base = entry('e', at(2026, 3, 29, 14, 43), 'cloudy', { habitId: 'h1', title: 'T', body: 'B' });

  it('starts blank with a neutral mood and an optional habit', () => {
    expect(blankDraft(5, 'h1')).toEqual({ title: '', body: '', mood: 'sunny', habitId: 'h1', createdAt: 5 });
    expect(blankDraft(5).habitId).toBeNull();
  });

  it('detects changes but ignores surrounding whitespace', () => {
    const d = draftFromEntry(base);
    expect(isDraftDirty(d, { ...d })).toBe(false);
    expect(isDraftDirty(d, { ...d, title: ' T ' })).toBe(false);
    expect(isDraftDirty(d, { ...d, body: 'B2' })).toBe(true);
    expect(isDraftDirty(d, { ...d, mood: 'star' })).toBe(true);
    expect(isDraftDirty(d, { ...d, habitId: null })).toBe(true);
    expect(isDraftDirty(d, { ...d, createdAt: d.createdAt - HOUR })).toBe(true);
  });

  it('requires a title or a body', () => {
    expect(canSave({ title: ' ', body: '\n' })).toBe(false);
    expect(validateDraft({ title: '', body: '' })).toMatch(/title/);
    expect(validateDraft({ title: 'x', body: '' })).toBeNull();
    expect(validateDraft({ title: '', body: 'x' })).toBeNull();
  });

  it('builds the store payload with a derived title and trimmed body', () => {
    const d = { ...blankDraft(at(2026, 3, 1) - DAY), body: '  Feeling strong today.\nMore text  ', mood: 'star' as const };
    expect(draftToInput(d)).toEqual({ title: 'Feeling strong today.', body: 'Feeling strong today.\nMore text', mood: 'star', habitId: null });
  });
});

describe('routing helpers', () => {
  it('reads the first param value', () => {
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam('')).toBeUndefined();
    expect(firstParam('a')).toBe('a');
    expect(firstParam(['b', 'c'])).toBe('b');
  });

  it('builds editor hrefs', () => {
    expect(editorHref()).toBe('/journal/new');
    expect(editorHref({ id: 'j1' })).toBe('/journal/new?id=j1');
    expect(editorHref({ habitId: 'h 1' })).toBe('/journal/new?habitId=h%201');
  });
});
