# RetroBooth v0.9.3 — Android Camera + Microphone Separate Apply Guide

**Purpose:** Fix the workflow that treated microphone initialization failures as camera failures. Camera must remain visible and testable even when audio cannot open. This is a camera/debug pilot, not an event-ready recorder.

## Why change the native shell?

The user-supplied v0.9.2 Android diagnostic reported `NotReadableError: Could not start audio source` in `request_media`. Android runtime CAMERA and RECORD_AUDIO permissions were `granted`, but the earlier JavaScript called `getUserMedia({video:...,audio:...})` in the same request. If audio failed, the whole request rejected before a preview stream became available. Device enumerations of zero are not reliable evidence that hardware is absent before successful access.

The Android manifest now adds the normal install-time `android.permission.MODIFY_AUDIO_SETTINGS` permission. A public NativePHP/WebView issue (#144, May 2026) describes this exact audio-source error when the WebView needs to choose a communication audio device. This is *not* proof that it caused the user’s issue. Source: https://github.com/NativePHP/mobile-air/issues/144

Android may pause the host Activity during its runtime permission dialog (official Activity docs: https://developer.android.com/reference/android/app/Activity ). The native bridge now avoids WebView media suspension for only that transient permission prompt, defers granting until Activity resume if necessary, and **still suspends WebView in onStop** when the app leaves the foreground. It also retains strict trusted-origin, known-resource and Android runtime permission checks. It does not silently grant unrelated web permissions.

## The new Admin controls

In **02 / DEVICE CHECK**, select a camera and microphone from their separate selectors. Choose Front, Rear, or Android System Default when a camera ID is not selected. Device labels may appear only after runtime permission is granted.

1. **1 / APPLY CAMERA - LIVE preview:** Requests VIDEO ONLY (`audio:false`). You should see yourself in the Booth CRT area and Camera Lab. The status says `CAMERA LIVE / PREVIEW ONLY` when mic is absent. This stream stays active while you test the microphone.
2. **2 / APPLY MICROPHONE:** Requests AUDIO ONLY (`video:false`), with a one-time basic-constraints retry for an unselected default microphone. On success it joins the already-live video stream without reopening the camera. Check the mic meter and the `MICROPHONE LIVE` label.
3. **Release mic ONLY:** Removes audio only. Camera stays visible. Useful for isolating WebView mic routing failures.
4. **Apply BOTH sequentially:** Convenience for normal staff setup. Camera is opened first, then mic independently (a healthy camera preview is retained if only the mic needs recovery); mic failure leaves the live camera preview running.
5. **Stop BOTH:** Releases both tracks. Quick camera/mic tests are still available but release their disposable tracks immediately.
6. **Export full diagnostic JSON:** Use after a failure. Look for `camera_apply_start`, `camera_apply_success`, `microphone_apply_start`, `microphone_basic_retry`, `microphone_apply_failure`, and native `webview_media_pause_suppressed` / `media_permission_deferred`. Export via Android document picker. Inspect the contents before sharing.

**Safety:** A partial state is **PREVIEW ONLY**. The guest Start button and programmatic Start path are locked until BOTH camera and microphone are live. This update intentionally does not offer silent guest recordings. Demo sessions remain available when both inputs are off. Even with both tracks present, event readiness requires real audio playback/lip sync and local durability checks.

## GitHub upload, build and update

1. **Patch**: extract `RetroBooth_v0.9.3_Independent_Media_PATCH.zip` and merge its contents at the repository ROOT (including `.github`). It is designed for the v0.9.2 Android-compile-fix baseline. Avoid overwriting unrelated changes without review. **Full repo**: use `RetroBooth_v0.9.3_Android_Windows_GitHub_Ready.zip` if repository files are incomplete.
2. Commit/push to the default branch. Keep `.github/workflows/build-android.yml`, `build-windows.yml`, `verify-all.yml`; delete any old `build-all.yml`.
3. GitHub > Actions > **RetroBooth - Build Android APK** > Run workflow. It must pass Java, JDK17, Gradle8.11.1, SDK35, lint and the build steps. Do NOT download Evidence instead of the APK artifact.
4. Install the TEST.apk only after a successful GitHub Android run. Package ID unchanged (`studio.luce.retrobooth.preview`), Android versionCode **12**. Use the same signing key as the installed build; otherwise update may be blocked. Export important clips before any uninstall/clear data.
5. Restart app, go to Admin, choose front camera, **APPLY CAMERA** only, verify live image; then APPLY MIC. Test separately with mic failure and after reconnect. Export logs.

## If microphone still fails

- Test a different app’s voice recorder and Android quick-settings global microphone toggle; stop Bluetooth headsets, USB audio peripherals, calling/recording apps.
- Confirm Android App Info permissions for RetroBooth and update Android System WebView.
- Press **Apply camera** first, note live image status, then **Apply microphone** and export JSON. A mic failure no longer makes camera test impossible.
- For escalation, obtain *app-scoped* diagnostic JSON plus, if available, filtered Android `adb logcat` around Chromium `media/audio/android` failures. Logcat can contain personal data; do not share raw full-device logs without review.

## Scope and known limitations

- Existing cloud, Android secure-SPP QR pilot, Windows EXE, privacy and timed QR logic are retained. This is not a validated H5.3 printer driver port, live projector or offline crash-proof recorder.
- Source-level and mock browser tests are not real Android device tests. Native Android APK compilation and physical audio routing cannot be certified by local `javac` checks without Android SDK and the device.
- A camera-only preview is not a recording and must never generate a QR ticket or upload.
