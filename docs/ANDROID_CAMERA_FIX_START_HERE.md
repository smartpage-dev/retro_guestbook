# Android Camera Hotfix — GitHub upload and test

1. Back up/export important local clips before changing APK signing keys, uninstalling or clearing data.
2. Extract the **full repo-root ZIP** into the root of your existing private GitHub repository. Preserve `.github` and `.htaccess`; do not add a nested `RetroBooth` folder. Or apply the **patch ZIP** over an otherwise complete v0.9 independent-workflow repository.
3. Commit and push to `main`. Check `src/app.js`, `src/template.html`, `tests/browser_v091_camera.py`, and `android/app/build.gradle` (versionCode 10) in the GitHub Code tab.
4. Actions > **RetroBooth - Build Android APK** > Run workflow. The separate Windows EXE workflow is unaffected by the Android build. Download `RetroBooth-Android-APK-v0.9.1-<run number>` from Artifacts **only if the Android job succeeds**.
5. Install `RetroBooth-v0.9.1-Android-TEST.apk` on a test device with the same signing identity as the installed v0.9 app. A debug-key mismatch may prevent in-place upgrade; do not uninstall before exporting recordings.
6. Android Settings > Apps > RetroBooth > Permissions: allow Camera and Microphone. Check global camera/mic privacy toggles and close other camera apps.
7. Booth Admin > 02 / DEVICE CHECK > Refresh devices. Test camera only and microphone only. Both should PASS independently. Select explicit devices if shown, or System default plus front/rear preference, then Apply camera + microphone.
8. In Camera Lab, confirm live picture and microphone meter. Record one disposable clip, check audio/video playback, and export it. Do not use guest data until physical acceptance passes.
9. If it fails, export diagnostics and provide Android model/version, Android System WebView version, camera/mic selections, separate probe results and full error text. This hotfix cannot guarantee support for every Android webcam driver.

See `docs/ANDROID_CAMERA_TROUBLESHOOTING.md` and `docs/CAMERA_HOTFIX_TEST_REPORT.md`.
