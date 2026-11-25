# RetroBooth v0.9.4-alpha.1 — Modern CRT Fix PATCH

**Apply on top of complete RetroBooth v0.9.3 Android/Windows independent-workflows repository ONLY.**

1. BACK UP your GitHub repository/worktree and export any valuable recordings from an installed app before considering uninstall/clearing app data. This patch does not touch recordings.
2. Extract *the contents* of this ZIP **into the repository root** (same level as package.json). Merge folders, including hidden `.github`; do not create a new nested folder. Check local changes before overwriting.
3. Confirm `src/appearance.css`, `src/template.html`, `src/sw.js`, `.github/workflows/build-android.yml`, `android/app/build.gradle` changed and `docs/MODERN_CRT_V094.md` is present.
4. In GitHub Desktop **Commit > Push** to `main` or your actual Actions default branch; then start a **NEW** Actions > RetroBooth - Build Android APK > Run workflow. Android v0.9.4 TEST APK / versionCode 13. For Windows use its separate independent workflow.
5. APK output is **RetroBooth-v0.9.4-Android-TEST.apk**, if GitHub compilation succeeds. Installing over v0.9.3 requires same signing key; never uninstall simply to force an update while clips matter.
6. Admin > Display Styles > 01 / Modern CRT television > Apply. Tap bottom-right Version 5 times to re-open Admin (top-left CH03 hold 5s as backup). Check real 32-inch Android display.

**This ZIP is source changes, not a compiled APK or executable.** No new camera, mic, capture, printer, or cloud data-path code is included. The base must have all the v0.9.3 files; otherwise use the FULL REPO ZIP.

Patch contains 29 program/test/documentation files plus manifest. Missing `.htaccess`, vendor, or historical docs should be fixed by the FULL ZIP, not this patch.
