# Quit — habit tracker (offline clone)

A React Native + Expo replica of the iOS app **"Quit: Habit Tracker"**, built to run fully offline:
no AI coach, no backend, no accounts, no paywall. All data stays on-device (AsyncStorage).

## Stack

- Expo SDK 57, Expo Router (file-based routes in `src/app`)
- TypeScript, Zustand (persisted with AsyncStorage)
- react-native-svg for rings and charts, Reanimated for animation

## Run

```bash
npm install
npm run web        # browser
npm run ios        # needs a dev build or Expo Go
npm run android
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Layout

| Path | What |
| --- | --- |
| `src/app` | Routes (screens). `(app)/` holds everything behind onboarding. |
| `src/components` | Shared UI kit (cards, buttons, rings, bars, headers). |
| `src/domain` | Pure logic: streaks, milestones, money/time saved, catalogs. |
| `src/features` | Feature-specific components and logic. |
| `src/store` | Zustand store + selectors (the only state source). |
| `src/theme` | Colors, spacing, type scale. |
