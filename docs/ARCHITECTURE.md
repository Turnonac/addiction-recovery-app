# WalkInLight architecture (v1)

Free, private iOS + Android app for one person recovering from porn. Daily
lowest-color check-in, clean-day counter, one daily phone call with one partner
who prays. No account, no server, no analytics. Everything lives on the phone.

Stack: Expo SDK 58 · React Native 0.88 · TypeScript strict · Expo Router ·
expo-sqlite · Zustand · date-fns · zod · react-native-svg. React Compiler is on
(`experiments.reactCompiler`), so avoid manual `useMemo`/`useCallback` unless a
value is passed to a non-React API.

**Expo has changed. Do not trust memory.** Before using any Expo / React Native
API, read the SDK 58 docs (`https://docs.expo.dev/versions/v58.0.0/...`, or
`https://docs.expo.dev/llms.txt`) or the package's `.d.ts` in `node_modules`.
Never install packages; everything needed is already in `package.json`.

## Product rules (fixed by the owner)

- Colors, best → worst: **Green** (recovery-oriented actions), **Blue**
  (careless about avoiding Red), **Yellow** (actions that move toward Red),
  **Red** (viewed anything explicit). Stored as severity 0..3 (`ColorLevel`).
- Each day stores ONLY: lowest color of the day (or null) and whether the user
  checked in with their partner. No timestamps.
- **Lowest wins:** a worse color replaces a better one. A better color than the
  stored one needs a "Did you pick X by mistake?" confirmation.
- **Late color after the call:** if a day is checked in and gets a WORSE color
  (previous color non-null), clear that day's check-in and prompt the user to
  call again. Previous color null → keep the check-in.
- **Counter** = calendar days since the last Red (Red day shows 0, next day 1).
  Before any Red, count from `settings.counterStartDate`. Unlogged days never
  reset it. Reds dated after today are ignored.
- **Best streak** = max over every completed run (`nextAnchor - anchor - 1`)
  and the current streak. Anchors = counterStartDate + every Red date ≤ today.
- **Day boundary = midnight.** Missed days can be made up (backfill any past day
  from History; Today shows "Yesterday isn't logged"). Future days are locked.
- **Partner call (one-way, once a day):** window = every day after the last
  checked-in day, through today. If today is already checked in, the window is
  empty ("You already talked with James today"). Before the first ever call,
  the window starts at counterStartDate (or installDate, or today), capped to
  the last 14 days. Script: "Since our last call, my lowest was {color}." Then
  the partner prays.
- Partner step is skippable in onboarding but labeled the most important step;
  Today shows an "Add your partner" card until a partner exists.
- Wording: the app says "explicit", never "pornography" or "porn". No Bible
  verses anywhere. Christian framing via partner prayer and grace wording
  ("God's grace doesn't reset.").
- Lists start EMPTY (no suggested behaviors). Red always shows the locked first
  line `LOCKED_RED_LINE`, which is not stored.
- Daily reminder: one local notification at a user-picked time, opt-out.
  Title "Daily check-in", body "Time for your daily check-in." Never mention
  the topic. Android channel name "Daily reminder".
- App switcher cover: iOS blur, Android FLAG_SECURE (blank preview, also blocks
  screenshots).
- Backup: export JSON via share sheet; import with preview, replace-all.
  OS backups (iCloud / Google) allowed (`android.allowBackup: true`).
- Light (Calm) + dark mode following the phone. 3 tabs: Today, History,
  Settings. My colors lives inside Settings.

## Folder layout and ownership

```
src/
  domain/            pure TypeScript, no React / Expo imports, fully unit tested
    types.ts         shared types (DONE — do not change without updating this doc)
    dates.ts         local-date helpers
    streak.ts        current + best streak
    call.ts          partner-call window
    checkin.ts       set-color decision rules
    history.ts       month grid, month summary, recent unlogged days
    backup.ts        zod schema, build + parse backup
    __tests__/*.test.ts
  data/              expo-sqlite persistence
    database.ts      open + migrate
    repository.ts    Repository interface + SQLite implementation
    memoryRepository.ts  in-memory Repository for tests
  state/
    store.ts         Zustand store (useAppStore), wired to a Repository
    __tests__/store.test.ts
  services/          thin wrappers over native modules
    notifications.ts
    contacts.ts
    backupFiles.ts
    privacy.ts
    dialer.ts
  ui/
    theme.ts         tokens (DONE)
    icons.tsx        SVG icons
    components/*.tsx shared components
  app/               Expo Router routes (screens only)
modules/
  contact-picker/    local Expo module: Android ACTION_PICK (no permission)
```

## Module contracts

### domain/dates.ts
```ts
toLocalDate(d: Date): LocalDate                  // device local time, 'YYYY-MM-DD'
todayLocal(): LocalDate
isValidLocalDate(s: string): boolean
dayNumber(s: LocalDate): number                  // Date.UTC(y,m-1,d)/86400000, DST-proof
addDays(s: LocalDate, n: number): LocalDate
diffDays(from: LocalDate, to: LocalDate): number // to - from, in days
compareDates(a, b): number                       // string compare is valid for ISO dates
datesBetween(start, end): LocalDate[]            // inclusive, oldest first; [] if start > end
formatLong(s): string                            // 'Thursday, October 29'
formatShort(s): string                           // 'Wed, Oct 28'
formatWeekdayLetter(s): string                   // 'W'
formatMonthYear(year, month1to12): string        // 'October 2026'
```

### domain/streak.ts
```ts
redDates(days: DayLog[], today): LocalDate[]     // Red dates ≤ today, ascending, unique
currentStreak(days, counterStartDate: LocalDate|null, today): number | null  // null if no anchor at all
bestStreak(days, counterStartDate, today): number | null
```

### domain/call.ts
```ts
callWindow(days: DayLog[], settings: { counterStartDate; installDate }, today): CallWindow
```

### domain/checkin.ts
```ts
decideSetColor(existing: DayLog | undefined, date: LocalDate, requested: ColorLevel,
               opts: { confirmBetter?: boolean }, today: LocalDate): SetColorOutcome
lowestOf(colors: (ColorLevel|null)[]): ColorLevel | null
```

### domain/history.ts
```ts
monthGrid(year: number, month1to12: number): (LocalDate | null)[]   // Sunday-first, padded with null to full weeks
monthSummary(days: DayLog[], year, month1to12, today, installDate: LocalDate|null):
  { counts: Record<ColorLevel, number>; checkIns: number; eligibleDays: number }
  // eligibleDays = days in month from max(monthStart, installDate) through yesterday,
  // plus today if today is checked in. checkIns counted over the same days.
recentUnloggedDates(days, installDate: LocalDate|null, today, limit = 7): LocalDate[]
  // past days (yesterday back to max(installDate, today - limit)) with no color, oldest first
weekStrip(days, today): { date; color: ColorLevel|null; checkedIn: boolean; isToday: boolean }[] // last 7 days ending today
backupNudgeDue(lastExportAt: string|null, installDate: LocalDate|null, today): boolean
  // true if never exported and installed ≥ 30 days ago, or last export ≥ 30 days ago
```

### domain/backup.ts
```ts
BackupSchemaV1: zod schema for BackupFileV1 (strict about types; validates dates and color range)
buildBackup(snapshot: AppSnapshot, exportedAt: string): BackupFileV1
parseBackup(input: unknown): { ok: true; snapshot: AppSnapshot; summary: { dayCount; firstDate; lastDate; partnerName } }
                           | { ok: false; error: 'not-a-backup' | 'newer-version' | 'invalid' }
backupFileName(today: LocalDate): string      // 'daily-backup-2026-10-29.json' (discreet)
```

### data/repository.ts
```ts
interface Repository {
  loadAll(): Promise<AppSnapshot>;
  upsertDay(day: DayLog): Promise<void>;
  deleteDay(date: LocalDate): Promise<void>;
  addBehavior(color: ColorLevel, text: string): Promise<Behavior>;
  updateBehavior(id: number, text: string): Promise<void>;
  deleteBehavior(id: number): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  replaceAll(snapshot: AppSnapshot): Promise<void>;   // one transaction
}
createSqliteRepository(db: SQLiteDatabase): Repository
```
SQLite schema (PRAGMA user_version = 1), DB file `app.db`:
- `day_log(date TEXT PRIMARY KEY NOT NULL, color INTEGER NULL CHECK(color BETWEEN 0 AND 3), checked_in INTEGER NOT NULL DEFAULT 0 CHECK(checked_in IN (0,1))) WITHOUT ROWID`
- `behavior(id INTEGER PRIMARY KEY AUTOINCREMENT, color INTEGER NOT NULL CHECK(color BETWEEN 0 AND 3), text TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0)`
- `settings(key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) WITHOUT ROWID` (JSON values)
A day row with color null and checked_in 0 is deleted rather than stored.

### data/database.ts
```ts
openAppDatabase(): Promise<SQLiteDatabase>    // opens 'app.db', runs migrations
```

### state/store.ts
```ts
useAppStore: UseBoundStore<StoreApi<AppState>>
interface AppState {
  ready: boolean;
  today: LocalDate;
  days: Record<LocalDate, DayLog>;
  behaviors: Behavior[];
  settings: Settings;
  init(repo: Repository): Promise<void>;            // loads snapshot, sets ready
  refreshToday(): void;                             // recompute today (midnight / foreground)
  setColor(date, color, opts?: { confirmBetter?: boolean }): Promise<SetColorOutcome>;
  setCheckedIn(date, value: boolean): Promise<void>;
  addBehavior(color, text): Promise<void>;
  updateBehavior(id, text): Promise<void>;
  removeBehavior(id): Promise<void>;
  setPartner(partner: Partner | null): Promise<void>;
  setReminder(reminder: Reminder): Promise<void>;   // persists only; screens call services/notifications
  setCounterStartDate(date: LocalDate): Promise<void>;
  completeOnboarding(): Promise<void>;              // sets onboardingDone + installDate = today
  markExported(iso: string): Promise<void>;
  replaceAll(snapshot: AppSnapshot): Promise<void>;
}
```
Writes go to the repository first, then update state. Text is trimmed; empty
behavior text is rejected (no-op). The store never calls native services.

### services
```ts
// notifications.ts
REMINDER_ID = 'daily-checkin'; CHANNEL_ID = 'daily-reminder'
configureForegroundHandler(): void      // no banner while the app is open
getPermission(): Promise<'granted' | 'denied' | 'undetermined'>
requestPermission(): Promise<boolean>   // creates the Android channel first
scheduleDailyReminder(hour, minute): Promise<void>   // cancel + schedule DAILY trigger, idempotent
cancelDailyReminder(): Promise<void>
reconcileReminder(reminder: Reminder): Promise<void> // ensure schedule matches settings (call on launch/foreground)
addReminderTapListener(onTap: () => void): () => void  // also handles cold-start last response
// contacts.ts
pickPartnerContact(): Promise<{ status: 'picked'; partner: Partner } | { status: 'cancelled' } | { status: 'unavailable' }>
  // iOS: expo-contacts/legacy presentContactPickerAsync (no permission).
  // Android: modules/contact-picker (ACTION_PICK, no permission); 'unavailable' if the module is missing (e.g. Expo Go).
// backupFiles.ts
shareBackupFile(file: BackupFileV1, fileName: string): Promise<boolean>   // write to cache, open share sheet
pickBackupFile(): Promise<unknown | null>   // document picker, read text, JSON.parse; null if cancelled
// privacy.ts
enablePrivacyCover(): Promise<void>     // iOS enableAppSwitcherProtectionAsync; Android preventScreenCaptureAsync
// dialer.ts
sanitizePhone(phone: string): string    // keep + 0-9 * #
callPhone(phone: string): Promise<boolean>  // Linking.openURL('tel:…'); false on failure
```

### ui/components (props are suggestions; keep them small and typed)
- `Screen` — themed background, safe-area, optional scroll, standard padding.
- `Card` — surface, border, radius.
- `Button` — variants `primary | secondary | ghost`, `disabled`, min height 50.
- `ColorGlyph` — `{ level, size }` circle in level.solid + glyph path.
- `ColorOptionCard` — radio-style selectable card: glyph, name, meaning, behavior line(s), selected state; role radio + accessibilityState.
- `WeekStrip` — 7 days with glyph circles, dashed ring for unlogged, check / dash marks for calls.
- `MonthCalendar` — month grid of 44×44 day buttons (soft bg, ink number, small glyph, check under if checked in; today dashed; future muted non-interactive).
- `ToggleRow` — label + accessible switch, 44pt target, uses theme track/knob.
- `SettingsRow` — pressable row with title, optional subtitle, chevron.
- `SectionHeader`, `Chip`.
- `icons.tsx` — Sun (Today tab), Calendar (History), Sliders (Settings), Phone, ChevronLeft, ChevronRight, Check, Plus, Lock, Users, X.

All interactive elements: `accessibilityRole`, `accessibilityLabel` where text is
not self-describing, min 44pt targets, text contrast per theme tokens.

### Routes (src/app)
- `_layout.tsx` — root Stack. Opens DB, `init(repo)`, shows a blank themed view until ready,
  redirects to `/onboarding` until `onboardingDone`. Enables privacy cover, foreground
  notification handler, reminder tap → `/check-in`, AppState `active` → `refreshToday()` +
  `reconcileReminder()`, a timer at the next local midnight → `refreshToday()`.
- `(tabs)/_layout.tsx` — Tabs: `index` (Today), `history`, `settings` (nested Stack).
- `(tabs)/index.tsx` — Today: date, greeting, counter card (days since last Red, best), week
  strip, today's check-in card, partner call card OR "Add your partner" card,
  "Yesterday isn't logged" card, 30-day backup reminder card.
- `(tabs)/history.tsx` — stats (current, best, month check-ins), month calendar with month
  navigation (no future months), color totals bar + legend, "Missed a day? Tap it…" hint.
  Tapping a past/today day opens `/day/[date]`.
- `(tabs)/settings/_layout.tsx` (Stack), `settings/index.tsx` (Recovery: partner row,
  My colors row; Daily reminder: toggle + time picker + preview; Your data: export/import
  + phone-backup note; About row), `settings/colors.tsx` (My colors editor),
  `settings/partner.tsx` (edit/remove partner, pick from contacts),
  `settings/about.tsx` (privacy statement, "not a medical device" disclaimer, version).
- `check-in.tsx` — modal, `?date=YYYY-MM-DD` (default today). 4 color cards with the user's
  behaviors, Red shows grace note ("Your counter restarts at 0. Your history and best streak
  stay. God's grace doesn't reset."), save → outcome handling (confirm-better dialog,
  becameRed → `/call`, clearedCheckIn → "You'd already talked with {name} today. Call again
  to share this?").
- `call.tsx` — modal: since-last-call list + lowest summary, script, "Call {name}" (dialer),
  on return to foreground asks "Did you talk with {name}?", manual "I talked with {name}".
- `day/[date].tsx` — modal: day color (change → `/check-in?date=`), "Checked in with partner" toggle.
- `onboarding.tsx` — steps: welcome (privacy promise) → how colors work → counter start
  ("Start counting today" / "My last Red day was…" date picker) → partner (most important
  step; contacts or typed; skippable) → color lists (Green, Blue, Yellow, Red; Red locked
  line) → reminder (time or no reminders; permission pre-prompt) → done.

Sample data in mockups (James, 23 days) is NOT shipped.
