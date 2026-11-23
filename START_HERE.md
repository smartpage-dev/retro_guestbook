# RetroBooth v0.9 - Build APK + Windows EXE

1. Extract this package. Copy the CONTENTS of the `RetroBooth` folder into your private GitHub repository root, including `.github`.
2. Commit and push to the default branch. Never upload only the ZIP.
3. Open **Actions > RetroBooth - Build APK and Windows EXE > Run workflow**.
4. Leave Android and Windows enabled; Windows ARM64 is optional and off initially.
5. After successful platform jobs, download their **Artifacts**, not logs or Evidence.

## Install/run these files

- Android: `RetroBooth-v0.9-Android-TEST.apk`.
- Windows installer: `RetroBooth-0.9.0-alpha.1-Windows-x64-Setup.exe`.
- Windows no-install: `RetroBooth-0.9.0-alpha.1-Windows-x64-Portable.exe`.

The source ZIP does not contain precompiled APK/EXE files. Native compilation/runtime could not be run here; the workflow must pass on GitHub. No hardware acceptance is claimed.

Both CRT styles are included in both apps. Windows printing is **not implemented**; Android retains the secure-SPP QR-only pilot. Windows has webcam recording, local playback/export, cloud upload and timed screen QR.

Use a persistent Android test signing key before keeping important recordings. Windows builds are unsigned. Moving an EXE does not move recordings. Each device needs its own cloud device identity. Existing cloud servers must explicitly allow `retrobooth://app` for Windows; do not reset server secrets.

Read `docs/SETUP_AND_RUNNING_GUIDE.md` or its Word companion. See `docs/TEST_REPORT.md` for exact test limits.
