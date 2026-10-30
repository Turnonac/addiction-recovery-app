# Building WalkInLight with EAS

App ID (iOS bundle identifier and Android package): `com.turnonac.walkinlight`.
Build profiles live in `eas.json`: `development` (dev client), `development-simulator`,
`preview` (internal; Android APK), `production` (store builds, auto-incremented).

## Credentials (environment variables, never committed)

| Variable | What it is |
| --- | --- |
| `EXPO_TOKEN` | Expo personal access token |
| `EXPO_ASC_KEY_ID` | App Store Connect API key ID |
| `EXPO_ASC_ISSUER_ID` | App Store Connect issuer ID |
| `EXPO_APPLE_TEAM_ID` | Apple Developer team ID |
| `ASC_API_KEY_P8` | Full text of the App Store Connect `.p8` key |

EAS reads the key from a file, so write it out first and never print it:

```sh
umask 077
printf '%s\n' "$ASC_API_KEY_P8" > /tmp/asc-api-key.p8
export EXPO_ASC_API_KEY_PATH=/tmp/asc-api-key.p8
export EXPO_APPLE_TEAM_TYPE=INDIVIDUAL   # or COMPANY_OR_ORGANIZATION
```

## First build

1. `npx eas-cli@latest whoami` — confirms the token works.
2. `npx eas-cli@latest init --non-interactive` — creates the Expo project and writes
   `extra.eas.projectId` (and `owner`) into `app.json`. Commit that change.
3. Android test app: `npx eas-cli@latest build -p android --profile preview --non-interactive`
   (EAS generates the upload keystore). Share the build page URL; it has an install link.
   This is also the first real compile of `modules/contact-picker` (Kotlin), so fix any
   compile errors it reports.
4. iPhone via TestFlight: `npx eas-cli@latest build -p ios --profile production --non-interactive`,
   then `npx eas-cli@latest submit -p ios --latest --non-interactive`.
   EAS registers the bundle ID with the API key. If submit asks for the App Store Connect app,
   create it once in App Store Connect (name Light2Life, bundle ID above) and put its numeric
   Apple ID in `eas.json` under `submit.production.ios.ascAppId`.

Free tier: 15 iOS + 15 Android builds a month, low-priority queue (expect 15–30 minutes).
Google Play publishing needs the Play developer account and a 12-tester, 14-day closed test first.
