import { defaultSettings, isEmptyDay, sortBehaviors, type Repository } from '@/data/repository';
import type { AppSnapshot, Behavior, DayLog, LocalDate, Settings } from '@/domain/types';

function copySettings(settings: Settings): Settings {
  return {
    ...defaultSettings(),
    ...settings,
    partner: settings.partner ? { ...settings.partner } : null,
    reminder: { ...settings.reminder },
  };
}

/**
 * In-memory Repository with the same observable behavior as the SQLite one
 * (empty days are deleted, behaviors are appended per color, ids are never
 * reused, loadAll returns sorted copies). For tests; nothing is persisted.
 */
export function createMemoryRepository(initial?: AppSnapshot): Repository {
  let days = new Map<LocalDate, DayLog>();
  let behaviors: Behavior[] = [];
  let settings: Settings = defaultSettings();
  /** Highest id ever handed out (like SQLite AUTOINCREMENT). */
  let lastBehaviorId = 0;

  function load(snapshot: AppSnapshot): void {
    const nextDays = new Map<LocalDate, DayLog>();
    for (const day of snapshot.days) {
      if (!isEmptyDay(day)) nextDays.set(day.date, { ...day });
    }
    const ids = new Set<number>();
    for (const b of snapshot.behaviors) {
      if (ids.has(b.id)) throw new Error(`Duplicate behavior id ${b.id}`);
      ids.add(b.id);
    }
    days = nextDays;
    behaviors = snapshot.behaviors.map((b) => ({ ...b }));
    settings = copySettings(snapshot.settings);
    lastBehaviorId = Math.max(lastBehaviorId, ...behaviors.map((b) => b.id));
  }

  if (initial) load(initial);

  return {
    async loadAll() {
      return {
        days: [...days.values()]
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
          .map((d) => ({ ...d })),
        behaviors: sortBehaviors(behaviors).map((b) => ({ ...b })),
        settings: copySettings(settings),
      };
    },

    async upsertDay(day) {
      if (isEmptyDay(day)) days.delete(day.date);
      else days.set(day.date, { date: day.date, color: day.color, checkedIn: day.checkedIn });
    },

    async upsertDays(list) {
      for (const day of list) {
        if (isEmptyDay(day)) days.delete(day.date);
        else days.set(day.date, { date: day.date, color: day.color, checkedIn: day.checkedIn });
      }
    },

    async deleteDay(date) {
      days.delete(date);
    },

    async addBehavior(color, text) {
      const sortOrder =
        behaviors.reduce((max, b) => (b.color === color ? Math.max(max, b.sortOrder) : max), -1) + 1;
      lastBehaviorId += 1;
      const behavior: Behavior = { id: lastBehaviorId, color, text, sortOrder };
      behaviors.push(behavior);
      return { ...behavior };
    },

    async updateBehavior(id, text) {
      behaviors = behaviors.map((b) => (b.id === id ? { ...b, text } : b));
    },

    async deleteBehavior(id) {
      behaviors = behaviors.filter((b) => b.id !== id);
    },

    async saveSettings(next) {
      settings = copySettings(next);
    },

    async replaceAll(snapshot) {
      load(snapshot);
    },
  };
}
