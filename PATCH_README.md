# RetroBooth v0.9.3 — independent CAMERA + MICROPHONE patch

Apply ONLY to the complete v0.9.2 Android Compile Fix repository. This ZIP contains paths relative to the GitHub repository ROOT. Do not place it in a subfolder. Before copying, preserve a backup/branch of your current repo and check modified files for conflicts.

1. Extract this ZIP and copy the files/folders into the repository ROOT, including hidden `.github`.
2. Confirm `.github/workflows/build-android.yml`, `build-windows.yml`, `verify-all.yml` exist; DO NOT restore old `build-all.yml`.
3. `npm run desktop:prepare`, `npm test`, `npm run test:native-core`, `python tools/verify-repository.py` locally if dependencies are available.
4. Commit + Push to the default GitHub branch. Run Actions > RetroBooth - Build Android APK > Run workflow (NEW run, not re-run old commit). Download the `RetroBooth-v0.9.3-Android-TEST.apk` from Artifacts only when the job succeeds.
5. Keep your existing APK signing identity. Android versionCode12 / same app ID; export important recordings and NEVER clear app data to resolve an update signature error.
6. Admin > 02 / DEVICE CHECK > **APPLY CAMERA - LIVE preview** first; this requests video ONLY and remains live if the mic fails. Then **APPLY MICROPHONE** or **Release mic ONLY**. Run a real 10-second A/V test only when both inputs work.
7. Export diagnostic JSON after any failure (camera_apply_failure / microphone_apply_failure), review before sharing.

Android original failure was NotReadableError: Could not start audio source on Samsung Android 13. This patch adds MODIFY_AUDIO_SETTINGS, adjusts transient runtime permission-dialog WebView handling, and splits A/V acquisition. It is a candidate fix; hardware success has NOT yet been verified. Windows printing and Android paper confirmation are unchanged.

Read docs/ANDROID_MEDIA_V093.md and docs/V093_TEST_REPORT.md for details and test boundaries.
