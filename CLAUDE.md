# WalkInLight

Read `AGENTS.md` (Expo rules) and `docs/ARCHITECTURE.md` (product rules + module contracts) before changing code.

- Never install or upgrade packages; `package.json` already has everything.
- Before using an Expo / React Native API, check SDK 58 docs or the package's `.d.ts` in `node_modules`.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`.
- Never ship the word "porn"/"pornography" or Bible verses in app text; say "explicit".
