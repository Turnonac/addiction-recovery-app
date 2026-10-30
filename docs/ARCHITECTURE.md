# Light2Life architecture (v1)

Light2Life (working name during development: WalkInLight) is a free, private
iOS + Android app for one person recovering from porn. Daily lowest-color
check-in, clean-day counter, one daily phone call with one partner who prays.
No account, no server, no analytics. Everything lives on the phone.

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
  A check-in opened for today keeps that day if midnight passes while it is open.
- **Partner call (one-way, once a day):** window = every day after the last
  checked-in day, through today. If today is already checked in, the window is
  empty ("You already talked with James today"). Before the first ever call,
  the window starts at counterStartDate (or installDate, or today), capped to
  the last 14 days. Script: "Since our last call, my lowest was {color}." Then
  the partner prays. A call counts for the day it was dialed, even if it ends
  after midnight.
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
- **App switcher cover:** iOS blur, Android FLAG_SECURE (blank preview, also
  blocks screenshots). It is turned on at launch, re-applied on every return to
  the foreground, and never turned off, including while the system notification
  permission alert is up (on iOS the blur shows behind that alert; accepted).
- **Screenshot mode:** when `EXPO_PUBLIC_SCREENSHOT_MODE` is `'1'`,
  `enablePrivacyCover()` does nothing, so Android store screenshots are not
  black. Only the `screenshots` build profile in `eas.json` sets it; never use
  that profile for store builds.
- **Backup:** export a JSON file via the share sheet. The file name is discreet
  (`daily-backup-YYYY-MM-DD.json`); the format id inside is
  `light2life-backup`. Files exported before the rename (format id
  `walkinlight-backup`, schemaVersion 1) still import. Import shows a preview,
  then replaces everything. OS backups (iCloud / Google) allowed
  (`android.allowBackup: true`).
- Light (Calm) + dark mode following the phone. 3 tabs: Today, History,
  Settings. My colors lives inside Settings.

## Folder layout and ownership

```
src/
  domain/                pure TypeScript, no React / Expo imports, fully unit tested
    types.ts             shared types (change only together with this doc)
    dates.ts             local-date helpers
    streak.ts            current + best streak
    call.ts              partner-call window
    checkin.ts           set-color decision rules
    history.ts           month grid + summary, week strip, unlogged days, backup nudge
    backup.ts            zod schema, build + parse backup
    __tests__/           backup, call, checkin, dates, history, streak
  data/                  expo-sqlite persistence
    database.ts          open + migrate
    repository.ts        Repository interface + SQLite implementation + shared helpers
    memoryRepository.ts  in-memory Repository for tests
  state/
    store.ts             Zustand store (useAppStore), wired to a Repository
    __tests__/store.test.ts
  services/              thin wrappers over native modules
    notifications.ts
    contacts.ts
    backupFiles.ts
    privacy.ts
    dialer.ts
    __tests__/           backupFiles, contacts, dialer, notifications, privacy
  features/
    onboarding/          onboarding steps, plus editors shared with Settings
      IntroSteps.tsx     WelcomeStep (1), ColorsIntroStep (2), StepNavProps
      CounterStep.tsx    step 3: where the counter starts
      PartnerStep.tsx    step 4: partner
      ColorListStep.tsx  step 5: one page per color
      ReminderStep.tsx   step 6: daily reminder (permission pre-prompt)
      DoneStep.tsx       summary, then completeOnboarding()
      StepLayout.tsx     StepScreen frame, CheckList, TextLink, ONBOARDING_STEPS = 6
      BehaviorEditor.tsx behavior chips + edit sheet (also Settings › My colors)
      PartnerEditor.tsx  contact pick or typed name + number (also Settings › Partner); a picked
                         number shows on a card to confirm or Change; saved exactly as entered
      pickers.tsx        date / time picker (Android dialog, iOS sheet), time and date formatting
      __tests__/         BehaviorEditor, CounterStep, PartnerEditor, screens
  ui/
    theme.ts             light / dark tokens, useAppTheme(), LEVEL_GLYPHS, spacing, MIN_TOUCH
    icons.tsx            SVG icons + TabIcon
    components/          presentational components (props only, no store), re-exported by index.ts
      Avatar.tsx Button.tsx Card.tsx Chip.tsx ColorGlyph.tsx ColorOptionCard.tsx
      ColorTotals.tsx MonthCalendar.tsx NotificationPreview.tsx Screen.tsx
      SectionHeader.tsx SettingsRow.tsx StepProgress.tsx TextField.tsx
      ToggleRow.tsx WeekStrip.tsx index.ts
      __tests__/         components, TextField
  app/                   Expo Router routes (screens only)
    _layout.tsx check-in.tsx call.tsx day/[date].tsx onboarding.tsx
    (tabs)/_layout.tsx (tabs)/index.tsx (tabs)/history.tsx
    (tabs)/settings/_layout.tsx index.tsx colors.tsx partner.tsx about.tsx
modules/
  contact-picker/        local Expo module "ContactPicker", Android only: ACTION_PICK (no permission)
    index.ts             re-exports the module (null when not linked) and its types
    src/                 ContactPickerModule.ts, ContactPicker.types.ts
    android/             Kotlin (expo.modules.contactpicker.ContactPickerModule)
    expo-module.config.json
```

`features/` may use the store and services; `ui/components` gets data through
props only.

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
daysInMonth(year, month1to12): number
dayOfWeek(s): number                             // 0 = Sunday … 6 = Saturday
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
// A counterStartDate after today is treated as today.
```

### domain/call.ts
```ts
FIRST_CALL_MAX_DAYS = 14
callWindow(days: DayLog[], settings: Pick<Settings, 'counterStartDate' | 'installDate'>, today): CallWindow
```

### domain/checkin.ts
```ts
decideSetColor(existing: DayLog | undefined, date: LocalDate, requested: ColorLevel,
               opts: { confirmBetter?: boolean }, today: LocalDate): SetColorOutcome
  // becameRed only when the day was not Red before.
lowestOf(colors: (ColorLevel|null)[]): ColorLevel | null
```

### domain/history.ts
```ts
BACKUP_NUDGE_DAYS = 30
monthGrid(year: number, month1to12: number): (LocalDate | null)[]   // Sunday-first, padded with null to full weeks
monthSummary(days: DayLog[], year, month1to12, today, installDate: LocalDate|null):
  { counts: Record<ColorLevel, number>; checkIns: number; eligibleDays: number }
  // counts = every logged color in the month dated ≤ today (backfilled days before install too).
  // eligibleDays = days in month from max(monthStart, installDate) through yesterday,
  // plus today if today is checked in. checkIns counted over the same days.
recentUnloggedDates(days, installDate: LocalDate|null, today, limit = 7): LocalDate[]
  // past days (yesterday back to max(installDate, today - limit)) with no color, oldest first
weekStrip(days, today, installDate: LocalDate|null = null):
  { date; color: ColorLevel|null; checkedIn: boolean; isToday: boolean; beforeInstall: boolean }[] // last 7 days ending today
backupNudgeDue(lastExportAt: string|null, installDate: LocalDate|null, today): boolean
  // true if never exported and installed ≥ 30 days ago, or last export ≥ 30 days ago
```

### domain/backup.ts
```ts
BACKUP_FORMAT = 'light2life-backup'           // written by every export
LEGACY_BACKUP_FORMAT = 'walkinlight-backup'   // files from before the rename; read, never written
BACKUP_SCHEMA_VERSION = 1
BackupSchemaV1: zod schema for BackupFileV1 (either format id; strict about types, no coercion;
  validates dates, color range, reminder time, unique day dates and behavior ids; unknown keys dropped)
buildBackup(snapshot: AppSnapshot, exportedAt: string): BackupFileV1   // format BACKUP_FORMAT, days sorted
parseBackup(input: unknown): { ok: true; snapshot: AppSnapshot; summary: { dayCount; firstDate; lastDate; partnerName } }
                           | { ok: false; error: 'not-a-backup' | 'newer-version' | 'invalid' }
  // not-a-backup: not an object, or neither format id
  // newer-version: 'light2life-backup' with schemaVersion > 1
  // invalid: anything else that fails the schema (a legacy file must be schemaVersion 1)
  // Drops day rows with no color and no check-in. Restored lastExportAt = later of the
  // file's exportedAt and its settings.lastExportAt.
backupFileName(today: LocalDate): string      // 'daily-backup-2026-10-29.json' (discreet)
```
`BackupFileV1.format` is `BackupFormat` (`'light2life-backup' | 'walkinlight-backup'`).

### data/repository.ts
```ts
interface Repository {
  loadAll(): Promise<AppSnapshot>;
  upsertDay(day: DayLog): Promise<void>;              // an empty day is deleted instead
  deleteDay(date: LocalDate): Promise<void>;
  addBehavior(color: ColorLevel, text: string): Promise<Behavior>;   // appended to that color's list
  updateBehavior(id: number, text: string): Promise<void>;
  deleteBehavior(id: number): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  replaceAll(snapshot: AppSnapshot): Promise<void>;   // one transaction
}
createSqliteRepository(db: SQLiteDatabase): Repository
// Shared helpers: isEmptyDay, sortBehaviors (color, sortOrder, id), defaultSettings,
// toColorLevel, settingsFromRows.
// data/memoryRepository.ts: createMemoryRepository(initial?: AppSnapshot): Repository
```
SQLite schema (PRAGMA user_version = 1), DB file `app.db`, WAL journal mode:
- `day_log(date TEXT PRIMARY KEY NOT NULL, color INTEGER NULL CHECK(color BETWEEN 0 AND 3), checked_in INTEGER NOT NULL DEFAULT 0 CHECK(checked_in IN (0,1))) WITHOUT ROWID`
- `behavior(id INTEGER PRIMARY KEY AUTOINCREMENT, color INTEGER NOT NULL CHECK(color BETWEEN 0 AND 3), text TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0)`
- `settings(key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) WITHOUT ROWID` (one row per
  Settings key, JSON value; an invalid value falls back to the default, unknown keys are ignored)
A day row with color null and checked_in 0 is deleted rather than stored.

### data/database.ts
```ts
DATABASE_NAME = 'app.db'
DATABASE_VERSION                              // = number of migrations
migrateDatabase(db): Promise<void>            // each step + its user_version bump in one transaction;
                                              // a newer database (app downgrade) is left alone
openAppDatabase(): Promise<SQLiteDatabase>    // opens 'app.db', runs migrations
```
Migrations are append-only: never edit a shipped entry.

### state/store.ts
```ts
BEHAVIOR_MAX_LENGTH = 120
useAppStore: UseBoundStore<StoreApi<AppState>>
interface AppState {
  ready: boolean;
  today: LocalDate;
  days: Record<LocalDate, DayLog>;
  behaviors: Behavior[];                            // sorted by color, then sortOrder
  settings: Settings;
  init(repo: Repository): Promise<void>;            // loads snapshot, sets ready
  refreshToday(): void;                             // recompute today (midnight / foreground)
  setColor(date, color, opts?: { confirmBetter?: boolean }): Promise<SetColorOutcome>;
  setCheckedIn(date, value: boolean): Promise<void>; // future days ignored; an empty day is deleted
  addBehavior(color, text): Promise<void>;
  updateBehavior(id, text): Promise<void>;
  removeBehavior(id): Promise<void>;
  setPartner(partner: Partner | null): Promise<void>;
  setReminder(reminder: Reminder): Promise<void>;   // persists only; screens call services/notifications
  setCounterStartDate(date: LocalDate): Promise<void>;  // a future date is saved as today
  completeOnboarding(): Promise<void>;              // onboardingDone, installDate = today, counterStartDate = today if unset
  markExported(iso: string): Promise<void>;         // rejects anything but an ISO-8601 instant
  replaceAll(snapshot: AppSnapshot): Promise<void>; // writes, then reloads from the repository
}
```
Writes run one at a time (queued), go to the repository first, then update
state. Behavior text is trimmed and cut to `BEHAVIOR_MAX_LENGTH`; empty text is
rejected (no-op). The store never calls native services.

### services
```ts
// notifications.ts
REMINDER_ID = 'daily-checkin'; CHANNEL_ID = 'daily-reminder'
type NotificationPermission = 'granted' | 'denied' | 'undetermined'
configureForegroundHandler(): void      // no banner, list entry, sound or badge while the app is open
getPermission(): Promise<NotificationPermission>   // iOS provisional / ephemeral count as granted;
                                                   // an Android reminder channel the user turned off counts as denied
requestPermission(): Promise<boolean>   // creates the Android channel first; prompts only if not granted;
                                        // false if the user turned the Android reminder channel off.
                                        // The privacy cover stays on during the system alert.
scheduleDailyReminder(hour, minute): Promise<void>   // cancel + schedule DAILY trigger, idempotent;
                                                     // rejects if the OS refuses
cancelDailyReminder(): Promise<void>
reconcileReminder(reminder: Reminder): Promise<void> // make the OS schedule match settings; never prompts, never throws
triggerMatchesTime(trigger: unknown, hour, minute): boolean  // Android 'daily' / iOS 'calendar' trigger shapes
addReminderTapListener(onTap: () => void): () => void  // also handles cold-start last response
// contacts.ts
pickPartnerContact(): Promise<{ status: 'picked'; partner: Partner } | { status: 'cancelled' } | { status: 'unavailable' }>
  // iOS: expo-contacts/legacy presentContactPickerAsync (no permission); a contact with several
  //   numbers gets a "Which number?" alert, mobile numbers first.
  // Android: modules/contact-picker (ACTION_PICK, no permission); 'unavailable' if the module is missing (e.g. Expo Go).
  // A second call while a picker is open resolves 'cancelled'.
// backupFiles.ts
MAX_BACKUP_BYTES = 5_000_000
BACKUP_PICKER_TYPES = ['application/json', 'text/plain', 'application/octet-stream']
shareBackupFile(file: BackupFileV1, fileName: string): Promise<boolean>
  // write to cache, open share sheet; true once the sheet closes (the OS doesn't say whether
  // the file was saved), false if sharing is unavailable or anything fails
pickBackupFile(): Promise<unknown | null>
  // document picker, read text (BOM stripped), JSON.parse; null if cancelled.
  // Throws BackupReadError: 'unreadable' (can't read, or over MAX_BACKUP_BYTES) | 'invalid-json'.
  // Deletes the picker's own copy (Android cache / iOS tmp/<bundle-id>-Inbox), never the original.
isBackupReadError(error: unknown): error is BackupReadError
// privacy.ts
enablePrivacyCover(): Promise<void>
  // iOS enableAppSwitcherProtectionAsync (once per JS runtime); Android preventScreenCaptureAsync
  // with a fresh key per call (a recreated Activity has a new window). Never throws.
  // Nothing turns the cover off. Does nothing when EXPO_PUBLIC_SCREENSHOT_MODE === '1'.
// dialer.ts
callPhone(phone: string): Promise<boolean>  // Linking.openURL('tel:' + the number as entered, encodeURI + '#'); false on failure
                                            // (no number, no telephony, iOS Simulator)
```

### ui/components (props only; colors from useAppTheme())
- `Screen` — themed background, safe-area `edges` (default `['top']` for tab
  screens), optional scroll, standard padding, pinned `footer`, `avoidKeyboard`.
  `ScreenHeader` — eyebrow, title, subtitle. `MODAL_EDGES` — edges for modal
  routes: iOS `['bottom']` (the sheet sits below the status bar), Android
  `['top', 'bottom']` (modals are full screen).
- `Card` — surface, border, radius. `StatTile` — History stat, read as one element.
- `Button` — variants `primary | secondary | outline | ghost | danger`, optional
  icon, `selected`, `disabled`; min height 50 (`size="lg"`: 54, ghost: 44). `BackButton` — "‹ Label" link.
- `ColorGlyph` — `{ level, size }` circle in level.solid + glyph path; `level = null`
  draws the dashed "not logged" ring. `ColorDots` (My colors row icon), `colorLabel()`.
- `ColorOptionCard` + `ColorOptionGroup` — radio-style color cards: glyph, name,
  meaning, behavior line(s), selected state; announced as one radio group.
- `ColorTotals` — History month totals: proportional bar + legend with counts.
- `WeekStrip` — 7 days with glyph circles, dashed ring for unlogged, check / dash marks for calls.
- `MonthCalendar` — month grid of 44pt day buttons (soft bg, ink number, small glyph, check
  under if checked in; today dashed; future muted and inert) with month arrows.
- `ToggleRow` — label + accessible switch, whole row is the target, uses theme track/knob.
- `SettingsGroup` / `SettingsRow` / `SettingsNote` — grouped rows with title,
  optional subtitle / value / action, chevron.
- `NotificationPreview` — lock-screen look-alike of the reminder.
- `StepProgress` — onboarding progress bars + caption.
- `TextField` — labelled text input. `Avatar` — decorative partner initial.
- `SectionHeader`; `Chip`, `AddChip`, `ChipList` (behavior chips).
- `icons.tsx` — Sun (Today tab), Calendar (History), Sliders (Settings), Phone,
  ChevronLeft, ChevronRight, Check, Plus, Minus, Lock, Users, X; `TabIcon` (pill behind the focused tab).

All interactive elements: `accessibilityRole`, `accessibilityLabel` where text is
not self-describing, min 44pt targets, text contrast per theme tokens.

### Routes (src/app)
- `_layout.tsx` — root Stack. Keeps the native splash up while it opens the DB and runs
  `init(repo)`; on failure shows "Couldn't open your data" with "Try again". `Stack.Protected`
  guards: until `onboardingDone` only `/onboarding` is reachable, afterwards it redirects to `/`.
  Modals (`check-in`, `call`, `day/[date]`) use `presentation: 'modal'` and anchor `(tabs)`, so a
  deep link to a modal closes onto Today. Enables the privacy cover and the foreground
  notification handler once; reminder tap → `/check-in?date=<today>`. AppState `active` →
  `refreshToday()`, `enablePrivacyCover()` again, and `reconcileReminder()` after 1.5 s
  (only once onboarding is done). A timer at the next local midnight → `refreshToday()`.
- `(tabs)/_layout.tsx` — JS Tabs (`expo-router/js-tabs`): `index` (Today), `history`,
  `settings` (nested Stack). Settings has `popToTopOnBlur`: leaving the tab resets its stack.
- `(tabs)/index.tsx` — Today: date, greeting, counter card (days since last Red, best), week
  strip, today's check-in card, partner call card OR "Add your partner" card,
  "Yesterday isn't logged" card, 30-day backup reminder card (→ Settings).
- `(tabs)/history.tsx` — stats (current, best, month check-ins), month calendar with month
  navigation (back to the earliest of installDate, counterStartDate and the oldest logged day;
  no future months), `ColorTotals`, "Missed a day? Tap it…" hint. Tapping a past/today day
  opens `/day/[date]`.
- `(tabs)/settings/_layout.tsx` — Stack (no native header, anchor `index`).
- `settings/index.tsx` — Recovery: partner row (or "Add your partner"), My colors row.
  Daily reminder: toggle (asks for permission when turned on), time picker, a note when
  notifications are denied ("Open phone settings") or never allowed ("Allow notifications"),
  preview. Your data: phone-backup note, Export backup file, Import backup file, last backup
  date. About row.
  - Export: build the file, open the share sheet, then ask "Did you save the backup file?".
    Only "Yes, I saved it" calls `markExported` (and quiets Today's backup card).
  - Import: pick a file → `parseBackup` → "Replace your data?" preview (day count, date
    range, partner) → `replaceAll`. If the restored reminder is on, asks for notification
    permission if needed; if it is still not allowed, saves the reminder as off and says so in
    the "Backup restored" alert.
- `settings/colors.tsx` (My colors editor), `settings/partner.tsx` (edit / remove partner,
  pick from contacts).
- `settings/about.tsx` — why Light2Life, privacy statement, "not a medical device"
  disclaimer, version plus the build number when known (iOS: the native build number;
  Android: only if the embedded config has a versionCode, which remote versioning usually
  leaves out), and Help and support / Privacy policy rows that open `docs/support.html` and
  `docs/privacy.html` on GitHub Pages.
- `check-in.tsx` — modal, `?date=YYYY-MM-DD` (default: today as of opening, kept if midnight
  passes); invalid or future dates close right away. `&from=call` returns to the call screen
  instead of opening a second one. 4 color cards with the user's behaviors, Red shows grace
  note ("Your counter restarts at 0. Your history and best streak stay. God's grace doesn't
  reset."), save → outcome handling (confirm-better dialog, becameRed → `/call` if a partner
  exists, clearedCheckIn → "You'd already talked with {name} today. Call again to share this?").
- `call.tsx` — modal (asks to add a partner if there is none): since-last-call list (long gaps
  collapse to the last 7 days + "Show all") with "Log it" for unlogged days, lowest summary,
  script, "Call {name}" (dialer). The day on screen when Call is tapped is the call day; when the
  app returns from the background it asks "Did you talk with {name}?" and marks that day.
  Manual "I talked with {name} — mark today" toggle, month check-in count.
- `day/[date].tsx` — modal: day color ("Log it" / "Change" → `/check-in?date=`), "Checked in
  with {partner}" toggle; invalid or future dates show a message.
- `onboarding.tsx` — steps: welcome (privacy promise) → how colors work → counter start
  ("Start counting today" / "My last Red day was…" date picker) → partner (most important
  step; contacts or typed; skippable) → color lists (Green, Blue, Yellow, Red; Red locked
  line; "Write these later" skips to the reminder) → reminder (time or no reminders; this page
  is the permission pre-prompt) → done ("Start" → `completeOnboarding()`). Steps 1–6 show
  "Step n of 6"; Android back goes to the previous step; no swipe-back.

Modal screens pass `MODAL_EDGES` to `Screen`.

Sample data in mockups (James, 23 days) is NOT shipped.
