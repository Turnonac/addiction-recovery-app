import { MOODS, type MoodDef } from '@/domain/catalog/moods';
import { addDays, startOfDay } from '@/domain/time';
import type { Habit, JournalEntry, MoodId } from '@/types';
import { formatDate, plural } from '@/utils/format';

/** Longest title derived from the body when the user leaves the title empty. */
export const DERIVED_TITLE_MAX = 40;
/** Longest title the editor accepts. */
export const TITLE_MAX = 80;
/** Title length from which the editor shows its "n/80" counter. */
export const TITLE_COUNTER_FROM = 60;
/** Days shown in the mood overview strip (today included). */
export const MOOD_STRIP_DAYS = 14;
/** Mood preselected for a brand-new entry (neutral middle). */
export const DEFAULT_MOOD: MoodId = 'sunny';

/** "Need inspiration?" prompts inserted into the body. */
export const JOURNAL_PROMPTS = [
  'What triggered my craving today?',
  'What am I proud of today?',
  'What would I tell a friend in my place?',
  'One thing I’m grateful for…',
  'How did I handle a hard moment?',
] as const;

// ---------------------------------------------------------------------------
// Ordering & grouping
// ---------------------------------------------------------------------------

/** Newest first; ties broken by last update so fresh edits float up. */
export function sortNewestFirst(entries: readonly JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt || b.updatedAt - a.updatedAt);
}

export interface DayGroup {
  /** Stable key for list sections. */
  key: string;
  /** Local midnight of the day. */
  dayStart: number;
  /** "29 Mar 2026" */
  label: string;
  /** Entries of that day, newest first. */
  data: JournalEntry[];
}

/** Groups entries by local calendar day, newest day first (SectionList-ready). */
export function groupByDay(entries: readonly JournalEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | null = null;
  for (const entry of sortNewestFirst(entries)) {
    const dayStart = startOfDay(entry.createdAt);
    if (!current || current.dayStart !== dayStart) {
      current = { key: String(dayStart), dayStart, label: formatDate(dayStart), data: [] };
      groups.push(current);
    }
    current.data.push(entry);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export interface JournalFilter {
  mood: MoodId | null;
  habitId: string | null;
  query: string;
}

export const EMPTY_FILTER: JournalFilter = { mood: null, habitId: null, query: '' };

/** Lower-cased, whitespace-split search tokens. */
export function queryTokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every token must appear in the title or body (case-insensitive). */
export function matchesQuery(entry: JournalEntry, query: string): boolean {
  const tokens = queryTokens(query);
  if (!tokens.length) return true;
  const haystack = `${entry.title}\n${entry.body}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function filterEntries(entries: readonly JournalEntry[], filter: JournalFilter): JournalEntry[] {
  return entries.filter(
    (e) =>
      (filter.mood == null || e.mood === filter.mood) &&
      (filter.habitId == null || e.habitId === filter.habitId) &&
      matchesQuery(e, filter.query),
  );
}

export function isFilterActive(filter: JournalFilter): boolean {
  return filter.mood != null || filter.habitId != null || queryTokens(filter.query).length > 0;
}

/** Habits that at least one entry links to, active first then archived, in home order. */
export function linkedHabits(habits: readonly Habit[], entries: readonly JournalEntry[]): Habit[] {
  const ids = new Set(entries.map((e) => e.habitId).filter((id): id is string => !!id));
  return habits
    .filter((h) => ids.has(h.id))
    .sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order);
}

/** Habits offered in the editor: active ones, plus the selected one if it's archived. */
export function habitOptions(habits: readonly Habit[], selectedId: string | null): Habit[] {
  return habits
    .filter((h) => !h.archived || h.id === selectedId)
    .sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order);
}

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

function scoreOf(id: MoodId): number {
  return MOODS.find((m) => m.id === id)?.score ?? 3;
}

/** Nearest mood for a 1..5 score (half rounds up). */
export function moodForScore(score: number): MoodDef {
  const i = Math.min(MOODS.length, Math.max(1, Math.round(score))) - 1;
  return MOODS[i];
}

export interface MoodAverage {
  /** Mean score 1..5 */
  score: number;
  mood: MoodDef;
  count: number;
}

export function averageMood(entries: readonly JournalEntry[]): MoodAverage | null {
  if (!entries.length) return null;
  const score = entries.reduce((sum, e) => sum + scoreOf(e.mood), 0) / entries.length;
  return { score, mood: moodForScore(score), count: entries.length };
}

export interface MoodDay {
  /** Local midnight */
  dayStart: number;
  /** Mood of the day (average when several entries), null when nothing was written. */
  mood: MoodId | null;
  count: number;
  isToday: boolean;
}

/** One slot per day for the last `days` days, oldest first, ending today. */
export function moodStrip(entries: readonly JournalEntry[], now: number, days: number = MOOD_STRIP_DAYS): MoodDay[] {
  const today = startOfDay(now);
  const buckets = new Map<number, number[]>();
  for (const e of entries) {
    const key = startOfDay(e.createdAt);
    const list = buckets.get(key);
    if (list) list.push(scoreOf(e.mood));
    else buckets.set(key, [scoreOf(e.mood)]);
  }
  const out: MoodDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = startOfDay(addDays(today, -i));
    const scores = buckets.get(dayStart) ?? [];
    const mood = scores.length ? moodForScore(scores.reduce((a, b) => a + b, 0) / scores.length).id : null;
    out.push({ dayStart, mood, count: scores.length, isToday: i === 0 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Diameter of a mood-strip dot so `days` slots fit in `width` (22 max, never below 12). */
export function stripDotSize(width: number, days: number = MOOD_STRIP_DAYS, max = 22, min = 12): number {
  if (!(width > 0)) return max;
  return Math.max(min, Math.min(max, Math.floor(width / days) - 1));
}

/** Ring size for `count` mood buttons in `width`, leaving room for the selected one's `scale`. */
export function pickerRingSize(width: number, count: number, max: number, scale: number, min = 44): number {
  if (!(width > 0)) return max;
  return Math.max(min, Math.min(max, Math.floor(width / count / scale)));
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Cuts at a word boundary so the result (with "…") is at most `max` chars. */
export function truncateAtWord(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const room = clean.slice(0, max - 1);
  const cut = room.lastIndexOf(' ');
  const head = cut >= max * 0.5 ? room.slice(0, cut) : room;
  return `${head.replace(/[\s.,;:!?…-]+$/, '')}…`;
}

/** The title to store: the typed title, else the body's first line (≤ 40 chars). */
export function deriveTitle(title: string, body: string, max: number = DERIVED_TITLE_MAX): string {
  const t = title.trim().replace(/\s+/g, ' ');
  if (t) return t;
  const firstLine = body.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  return truncateAtWord(firstLine.replace(/\s+/g, ' '), max);
}

/** Body collapsed to one paragraph for the 2-line list preview. */
export function previewText(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}

/** Appends a prompt as a new paragraph and leaves the cursor on a fresh line. */
export function insertPrompt(body: string, prompt: string): string {
  const head = body.replace(/\s+$/, '');
  return head ? `${head}\n\n${prompt}\n` : `${prompt}\n`;
}

/** "72/80" once a title gets close to the limit, else undefined. */
export function titleCounter(title: string, max: number = TITLE_MAX, from: number = TITLE_COUNTER_FROM): string | undefined {
  return title.length >= from ? `${title.length}/${max}` : undefined;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function entryCountLabel(n: number): string {
  return plural(n, 'entry', 'entries');
}

// ---------------------------------------------------------------------------
// Editor draft
// ---------------------------------------------------------------------------

export interface EntryDraft {
  title: string;
  body: string;
  mood: MoodId;
  habitId: string | null;
  createdAt: number;
}

export function blankDraft(now: number, habitId: string | null = null): EntryDraft {
  return { title: '', body: '', mood: DEFAULT_MOOD, habitId, createdAt: now };
}

export function draftFromEntry(entry: JournalEntry): EntryDraft {
  return { title: entry.title, body: entry.body, mood: entry.mood, habitId: entry.habitId, createdAt: entry.createdAt };
}

/** True when the user changed anything worth asking about before discarding. */
export function isDraftDirty(initial: EntryDraft, draft: EntryDraft): boolean {
  return (
    initial.title.trim() !== draft.title.trim() ||
    initial.body.trim() !== draft.body.trim() ||
    initial.mood !== draft.mood ||
    initial.habitId !== draft.habitId ||
    initial.createdAt !== draft.createdAt
  );
}

export function canSave(draft: Pick<EntryDraft, 'title' | 'body'>): boolean {
  return !!(draft.title.trim() || draft.body.trim());
}

/** Error message for an unsavable draft, else null. */
export function validateDraft(draft: Pick<EntryDraft, 'title' | 'body'>): string | null {
  return canSave(draft) ? null : 'Add a title or write a few words first.';
}

/** Store payload for a draft (title derived from the body when empty). */
export function draftToInput(draft: EntryDraft): { title: string; body: string; mood: MoodId; habitId: string | null } {
  return { title: deriveTitle(draft.title, draft.body), body: draft.body.trim(), mood: draft.mood, habitId: draft.habitId };
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/** First value of a search param ("" → undefined). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v : undefined;
}

export function entryHref(id: string): string {
  return `/journal/${id}`;
}

export function editorHref(opts: { id?: string; habitId?: string | null } = {}): string {
  if (opts.id) return `/journal/new?id=${encodeURIComponent(opts.id)}`;
  if (opts.habitId) return `/journal/new?habitId=${encodeURIComponent(opts.habitId)}`;
  return '/journal/new';
}
