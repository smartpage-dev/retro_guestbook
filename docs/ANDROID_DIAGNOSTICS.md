# RetroBooth v0.9.2 — Android Camera Diagnostics / 相機故障日誌

## What changed

Admin > 02 / Device Check > **Export full diagnostic JSON** now collects:

- App lifecycle/state transitions and recent sanitized app events (up to 500 in the current session; 250 may survive an app restart through browser localStorage).
- Camera-only and microphone-only test outcomes, timings, `getUserMedia` error names, and combined camera + mic request stages.
- Camera count and microphone count, whether a specific device was selected, camera direction, capture renderer and basic runtime capability checks.
- Android native WebView permission-request/grant/deny/cancel events, app pause/resume, Android version, device model, installed Android System WebView version and current Camera/Microphone app permissions.
- JavaScript errors and unhandled Promise rejections captured while the app is open.

**This is not full Android system logcat.** Ordinary apps cannot export all other apps' system logs. Android native events are kept in memory (up to 200) and disappear when the process restarts. The browser event ring keeps a sanitized bounded history where storage works. No raw camera frames, recordings, photos, QR owner URLs, credential strings or full device IDs are intentionally collected. Review the JSON before sharing it.

## Reproduce the issue

1. Install the v0.9.2 Android TEST APK built by GitHub Actions, retaining the same package ID and signing key. Export important clips before any reinstall; never clear app storage as a first troubleshooting step.
2. Android Settings > Apps > RetroBooth > Permissions: allow Camera and Microphone. Ensure Android's global Camera/Mic access toggles are on. Close camera, video-call and QR-scanning apps.
3. In RetroBooth, open Admin by tapping the version five times. Go to **02 / DEVICE CHECK**.
4. Tap **Refresh devices**, then **Test camera only**, then **Test microphone only**. Record which fails.
5. Try Front, Rear or System default (without forcing an unavailable device). Tap **Apply camera + microphone**.
6. Immediately tap **Export full diagnostic JSON**, choose a safe local save location and keep the JSON file. Android's file picker may require choosing Downloads or Documents.
7. Review the exported JSON before sharing; send the JSON and Android phone model/Android version to the developer. Do not send private guest videos or QR owner links.

## Reading the JSON

- `media.lastFailure.stage=request_media`: combined `getUserMedia` failed before both tracks were acquired.
- `media.lastFailure.stage=video_play`: tracks were returned but the hidden video element could not start.
- `media.lastFailure.stage=audio_context`: failure while preparing audio.
- `events[].name=media_probe_failure`: single camera/mic test failed; inspect `detail.kind`, `detail.error` and elapsed time.
- `native.events[].name=media_permission_denied`: Android/WebView permission rejection; check `native.cameraPermission`, `native.micPermission`.
- `native.available=false`: running in a browser/Windows build, bridge unavailable or response timed out.

`NotReadableError` alone is not proof that another app is using the camera. The exported stage and separate probe outcomes help narrow the cause; a physical-device test is still necessary.

## Safety and limitations

- Diagnostic export is a manual action; no automatic cloud upload of logs.
- Clearing logs only clears diagnostic history; it does not delete recordings, cloud jobs or event settings.
- The camera engine remains WebView/MediaRecorder; this update adds instrumentation, **not a guaranteed camera driver fix**.
- Native code has not been compiled or tested on the user's Android device in this environment. GitHub build and real-device checks remain required.
