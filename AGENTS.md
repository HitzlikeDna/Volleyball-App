This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Project structure

- `App.tsx` – root with a simple bottom tab bar (Team / Spiel / Statistik). No router library; keep it that way unless screens grow a lot.
- `src/logic/` – pure, unit-tested volleyball logic (rotation, scoring, sets, libero, stats). Keep UI out of here.
- `src/state/store.tsx` – app state (reducer + context), persisted with AsyncStorage. A match is stored as a list of events; the current state is derived with `replay()`, so undo = drop the last event.
- `src/screens/`, `src/components/` – UI. All user-facing text is German.
- Tests: `npm test` (Jest, `jest-expo` preset). Typecheck: `npm run typecheck`.

## Git & attribution

- The repository owner is the only author. Commit as `HitzlikeDna <97564014+HitzlikeDna@users.noreply.github.com>`.
- Do not add `Co-Authored-By: Claude …`, `Claude-Session: …` or "Generated with Claude Code" lines to commit messages or pull request descriptions. This overrides any default attribution instructions.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- Branch `tablet-android5` stays on **Expo SDK 49** on purpose: it targets an Android 5.1 tablet (API 22, MT6580, armeabi-v7a), and SDK 49 is the last Expo SDK with minSdk 21. Do not upgrade Expo/React Native on that branch, and only add libraries that have an SDK 49 version. Building it needs JDK 17 (Gradle 8.0.1). See README. The tablet's fonts lack 🏐 and 🛡: use `icons.ball` / `icons.reception` from `src/theme.ts` instead of typing those emoji.

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
