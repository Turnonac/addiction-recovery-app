# Light2Life

A free, private daily check-in app for recovery, for iOS and Android. Each day you log your
lowest color, keep a clean-day counter, and make one short call with your partner. There is no
account, server or analytics; everything stays on the phone.

Built with Expo SDK 58, React Native 0.88, TypeScript, Expo Router, expo-sqlite and Zustand.
Internal IDs (bundle ID `com.turnonac.walkinlight`, Expo slug, URL scheme) keep the original
WalkInLight name.

## Getting started

Needs Node 22.13+ (or 24.3+).

```sh
npm ci
npm start          # Expo dev server; open in a development build
npm run check      # typecheck, lint and tests (what CI runs)
```

The app has custom native code (`modules/contact-picker`), so it needs a development build
rather than Expo Go. See [docs/BUILDING.md](docs/BUILDING.md) for EAS builds, TestFlight and
credentials.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): product rules, folder layout and module contracts.
  Read it before changing code.
- [docs/BUILDING.md](docs/BUILDING.md): building, signing and releasing with EAS.
- [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md): rules for coding agents.
