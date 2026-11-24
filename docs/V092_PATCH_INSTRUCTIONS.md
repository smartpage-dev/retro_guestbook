# RetroBooth v0.9.2 — Android Camera Diagnostics patch

This is a source-only patch for a **complete v0.9.1 independent Android/Windows GitHub repository**. It does not contain a compiled APK or EXE. If your repository was previously missing source files or dotfiles, use the **complete GitHub Ready ZIP** instead of the patch.

1. Back up your current repository and export any important local recordings from installed devices. Do not clear app data.
2. Extract this patch and merge its **contents** into the repository root, including `.github` and `src`. Review existing modifications before replacing files.
3. Commit and push to the default branch. Do not upload the ZIP as one GitHub file.
4. Actions > **RetroBooth - Build Android APK** > Run workflow. Android app ID is unchanged, `versionCode` is **11**. Use the same test signing key for in-place upgrades.
5. Download the successful Android TEST APK artifact. If it fails to compile, download that run's build logs; no Android SDK compilation was done when preparing this patch.
6. Install on a disposable Android device, grant Camera and Microphone, open Admin > Device Check, then test Camera only, Microphone only, and Apply camera + microphone.
7. While the failure is visible, press **Export full diagnostic JSON**. Choose a local document destination; review the JSON and share it with the developer. Do not send private recordings or QR owner links.

The log is app-scoped, not system logcat. It includes Android permission decisions, WebView version, media acquisition stage and recent sanitized events. Up to 250 browser events may survive app restarts. Clear session logs only clears diagnostics, not recordings.

Full instructions: `docs/ANDROID_DIAGNOSTICS.md`. Scope/tests: `docs/V092_TEST_REPORT.md`.
