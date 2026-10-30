# Light2Life

A free, private daily check-in app for recovery, for iOS and Android. Each day you log your
lowest color, keep a clean-day counter, and make one short call with your partner. There is no
account, server or analytics; everything stays on the phone.

Built with Expo SDK 58, React Native 0.88, TypeScript, Expo Router, expo-sqlite and Zustand.
App ID `com.turnonac.light2life`, URL scheme `light2life://`, Expo project `@turnonac/light2life`.

## Getting started

Needs Node 22 (22.13 or later), 24 (24.3 or later), or 26 and up.

```sh
npm ci
npm start          # Expo dev server; open in a development build
npm run check      # typecheck, lint and tests (what CI runs)
```

The app has custom native code (`modules/contact-picker`), so it needs a development build
rather than Expo Go. See [docs/BUILDING.md](docs/BUILDING.md) for EAS builds, store releases
and credentials.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): product rules, folder layout and module contracts.
  Read it before changing code.
- [docs/BUILDING.md](docs/BUILDING.md): building, signing and releasing with EAS.
- [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md): rules for coding agents.
