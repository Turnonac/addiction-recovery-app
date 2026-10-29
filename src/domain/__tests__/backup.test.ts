import { describe, expect, it, test } from '@jest/globals';

import { backupFileName, BackupSchemaV1, buildBackup, parseBackup } from '@/domain/backup';
import type { AppSnapshot, BackupFileV1 } from '@/domain/types';

const EXPORTED_AT = '2026-10-29T20:15:00.000Z';

const snapshot: AppSnapshot = {
  days: [
    { date: '2026-10-28', color: 2, checkedIn: true },
    { date: '2026-10-01', color: 0, checkedIn: false },
    { date: '2026-10-15', color: null, checkedIn: true },
    { date: '2026-10-20', color: 3, checkedIn: false },
  ],
  behaviors: [
    { id: 1, color: 0, text: 'Called a friend', sortOrder: 0 },
    { id: 2, color: 2, text: 'Scrolling late at night', sortOrder: 0 },
    { id: 5, color: 2, text: 'Phone in bed', sortOrder: 1 },
  ],
  settings: {
    partner: { name: 'Sam', phone: '+1 (555) 010-0200' },
    reminder: { enabled: true, hour: 21, minute: 30 },
    counterStartDate: '2026-10-01',
    installDate: '2026-10-01',
    onboardingDone: true,
    lastExportAt: '2026-09-01T08:00:00.000Z',
  },
};

const sortedDays = [...snapshot.days].sort((a, b) => a.date.localeCompare(b.date));

/** What parsing a file exported at EXPORTED_AT restores: that export is the last backup. */
const restored = (input: AppSnapshot): AppSnapshot => ({
  ...input,
  settings: { ...input.settings, lastExportAt: EXPORTED_AT },
});

/** A JSON round trip, like writing the file and reading it back. */
const viaJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

/** A valid exported file as plain JSON, for tests that mutate it. */
const validFile = () => viaJson(buildBackup(snapshot, EXPORTED_AT)) as Record<string, any>;

describe('buildBackup', () => {
  it('wraps the snapshot with format, version and export time', () => {
    const file = buildBackup(snapshot, EXPORTED_AT);
    expect(file.format).toBe('walkinlight-backup');
    expect(file.schemaVersion).toBe(1);
    expect(file.exportedAt).toBe(EXPORTED_AT);
    expect(file.days).toEqual(sortedDays);
    expect(file.behaviors).toEqual(snapshot.behaviors);
    expect(file.settings).toEqual(snapshot.settings);
  });

  it('copies instead of aliasing the snapshot', () => {
    const file = buildBackup(snapshot, EXPORTED_AT);
    file.days[0].color = 3;
    file.settings.partner!.name = 'Changed';
    file.settings.reminder.hour = 5;
    expect(snapshot.days[1]).toEqual({ date: '2026-10-01', color: 0, checkedIn: false });
    expect(snapshot.settings.partner!.name).toBe('Sam');
    expect(snapshot.settings.reminder.hour).toBe(21);
  });

  it('passes its own schema', () => {
    expect(BackupSchemaV1.safeParse(buildBackup(snapshot, EXPORTED_AT)).success).toBe(true);
  });
});

describe('parseBackup: round trip', () => {
  it('build -> JSON -> parse returns the same snapshot, with this export as the last backup', () => {
    const result = parseBackup(viaJson(buildBackup(snapshot, EXPORTED_AT)));
    expect(result).toEqual({
      ok: true,
      snapshot: restored({ ...snapshot, days: sortedDays }),
      summary: { dayCount: 4, firstDate: '2026-10-01', lastDate: '2026-10-28', partnerName: 'Sam' },
    });
  });

  test.each<[string, AppSnapshot, { dayCount: number; firstDate: string | null; lastDate: string | null; partnerName: string | null }]>([
    [
      'empty data, no partner',
      { days: [], behaviors: [], settings: { ...snapshot.settings, partner: null, lastExportAt: null } },
      { dayCount: 0, firstDate: null, lastDate: null, partnerName: null },
    ],
    [
      'one day',
      { ...snapshot, days: [{ date: '2026-10-29', color: 1, checkedIn: false }] },
      { dayCount: 1, firstDate: '2026-10-29', lastDate: '2026-10-29', partnerName: 'Sam' },
    ],
    [
      'fresh install defaults',
      {
        days: [],
        behaviors: [],
        settings: {
          partner: null,
          reminder: { enabled: false, hour: 21, minute: 0 },
          counterStartDate: null,
          installDate: null,
          onboardingDone: false,
          lastExportAt: null,
        },
      },
      { dayCount: 0, firstDate: null, lastDate: null, partnerName: null },
    ],
  ])('summary: %s', (_name, input, summary) => {
    const result = parseBackup(viaJson(buildBackup(input, EXPORTED_AT)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary).toEqual(summary);
      expect(result.snapshot).toEqual(restored(input));
    }
  });

  it('restores the export time even when the file recorded no earlier export', () => {
    // A first export: the settings were saved before markExported() ran.
    const file = viaJson(
      buildBackup({ ...snapshot, settings: { ...snapshot.settings, lastExportAt: null } }, EXPORTED_AT),
    );
    const result = parseBackup(file);
    expect(result.ok && result.snapshot.settings.lastExportAt).toBe(EXPORTED_AT);
  });

  it('keeps a later recorded export time', () => {
    const later = '2026-10-30T08:00:00.000Z';
    const file = viaJson(
      buildBackup({ ...snapshot, settings: { ...snapshot.settings, lastExportAt: later } }, EXPORTED_AT),
    );
    const result = parseBackup(file);
    expect(result.ok && result.snapshot.settings.lastExportAt).toBe(later);
  });

  it('compares export times as instants, not strings', () => {
    const file = validFile();
    // 20:00Z is later than 21:15+02:00 (19:15Z), though it sorts first as a string.
    file.exportedAt = '2026-10-29T21:15:00+02:00';
    file.settings.lastExportAt = '2026-10-29T20:00:00.000Z';
    const result = parseBackup(file);
    expect(result.ok && result.snapshot.settings.lastExportAt).toBe('2026-10-29T20:00:00.000Z');
  });

  it('accepts timestamps with an offset', () => {
    const file = validFile();
    file.exportedAt = '2026-10-29T21:15:00+02:00';
    expect(parseBackup(file).ok).toBe(true);
  });

  it('drops unknown keys (forward compatible within v1)', () => {
    const file = validFile();
    file.theme = 'dark';
    file.days[0].note = 'extra';
    file.settings.extra = true;
    const result = parseBackup(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.days[0]).toEqual({ date: '2026-10-01', color: 0, checkedIn: false });
      expect(result.snapshot.settings).toEqual(restored(snapshot).settings);
      expect(Object.keys(result.snapshot)).toEqual(['days', 'behaviors', 'settings']);
    }
  });

  it('drops empty day rows (no color, no check-in) and sorts days', () => {
    const file = validFile();
    file.days = [
      { date: '2026-10-29', color: 1, checkedIn: false },
      { date: '2026-10-02', color: null, checkedIn: false },
      { date: '2026-10-03', color: null, checkedIn: true },
    ];
    const result = parseBackup(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.days.map((d) => d.date)).toEqual(['2026-10-03', '2026-10-29']);
      expect(result.summary).toMatchObject({ dayCount: 2, firstDate: '2026-10-03', lastDate: '2026-10-29' });
    }
  });
});

describe('parseBackup: not a backup', () => {
  test.each<[string, unknown]>([
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['string', 'walkinlight-backup'],
    ['array', [buildBackup(snapshot, EXPORTED_AT)]],
    ['empty object', {}],
    ['other format', { ...buildBackup(snapshot, EXPORTED_AT), format: 'other-app' }],
    ['missing format', { schemaVersion: 1, days: [], behaviors: [] }],
  ])('%s', (_name, input) => {
    expect(parseBackup(input)).toEqual({ ok: false, error: 'not-a-backup' });
  });
});

describe('parseBackup: newer version', () => {
  test.each<[string, unknown]>([
    ['schemaVersion 2', { ...buildBackup(snapshot, EXPORTED_AT), schemaVersion: 2 }],
    ['schemaVersion 3 with a different shape', { format: 'walkinlight-backup', schemaVersion: 3, entries: [] }],
  ])('%s', (_name, input) => {
    expect(parseBackup(input)).toEqual({ ok: false, error: 'newer-version' });
  });
});

describe('parseBackup: invalid', () => {
  test.each<[string, (file: Record<string, any>) => void]>([
    ['schemaVersion 0', (f) => (f.schemaVersion = 0)],
    ['schemaVersion as string', (f) => (f.schemaVersion = '1')],
    ['schemaVersion missing', (f) => delete f.schemaVersion],
    ['exportedAt not a timestamp', (f) => (f.exportedAt = 'yesterday')],
    ['days not an array', (f) => (f.days = {})],
    ['color 4', (f) => (f.days[0].color = 4)],
    ['color -1', (f) => (f.days[0].color = -1)],
    ['color 1.5', (f) => (f.days[0].color = 1.5)],
    ['color as string', (f) => (f.days[0].color = '2')],
    ['color missing', (f) => delete f.days[0].color],
    ['impossible date', (f) => (f.days[0].date = '2026-02-30')],
    ['date with time', (f) => (f.days[0].date = '2026-10-29T00:00:00Z')],
    ['date as number', (f) => (f.days[0].date = 20261029)],
    ['checkedIn as number', (f) => (f.days[0].checkedIn = 1)],
    ['duplicate day', (f) => f.days.push({ ...f.days[0] })],
    ['behavior color out of range', (f) => (f.behaviors[0].color = 5)],
    ['behavior empty text', (f) => (f.behaviors[0].text = '   ')],
    ['behavior id not an integer', (f) => (f.behaviors[0].id = 1.5)],
    ['duplicate behavior id', (f) => (f.behaviors[1].id = f.behaviors[0].id)],
    ['reminder hour 24', (f) => (f.settings.reminder.hour = 24)],
    ['reminder minute 60', (f) => (f.settings.reminder.minute = 60)],
    ['reminder enabled as string', (f) => (f.settings.reminder.enabled = 'true')],
    ['invalid counterStartDate', (f) => (f.settings.counterStartDate = '2026-13-01')],
    ['invalid installDate', (f) => (f.settings.installDate = 'today')],
    ['invalid lastExportAt', (f) => (f.settings.lastExportAt = 'not a date')],
    ['partner missing phone', (f) => (f.settings.partner = { name: 'Sam' })],
    ['onboardingDone as string', (f) => (f.settings.onboardingDone = 'yes')],
    ['settings missing', (f) => delete f.settings],
    ['behaviors missing', (f) => delete f.behaviors],
  ])('%s', (_name, mutate) => {
    const file = validFile();
    mutate(file);
    expect(parseBackup(file)).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('BackupSchemaV1', () => {
  it('infers a type compatible with BackupFileV1', () => {
    const parsed = BackupSchemaV1.parse(validFile());
    const typed: BackupFileV1 = parsed;
    expect(typed.format).toBe('walkinlight-backup');
  });
});

describe('backupFileName', () => {
  it('is discreet and dated', () => {
    expect(backupFileName('2026-10-29')).toBe('daily-backup-2026-10-29.json');
  });
});
