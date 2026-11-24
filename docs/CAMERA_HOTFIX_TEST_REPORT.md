# RetroBooth v0.9.1 Android Camera Hotfix — scoped test report

24 November 2026. Based on the user's approved v0.9 independent Android/Windows GitHub-ready source. The original v0.9 archive was not modified.

## Change summary

- Admin Device Check now offers independent camera and microphone selection, front/rear/system-default preference, independent camera-only/mic-only probes, and readable status diagnostics.
- Probes stop all acquired tracks and do not create guest recordings.
- Combined capture requires both audio and video; one basic-constraints retry is permitted only if neither input has an explicitly selected device ID, and only for NotReadable/Abort/Overconstrained errors. It preserves the preferred camera facing mode. Explicit selected devices are never silently replaced.
- Android application ID is unchanged; versionCode is 10 and versionName is 0.9.1-alpha.1. Android and Windows build workflows remain independent.

## Executed local checks

- `npm run desktop:prepare` PASS.
- `npm test` PASS, including 46 desktop security/contract checks and retained JS tests.
- `python tools/verify-repository.py` PASS.
- `python tests/browser_v091_camera.py` with Linux Chromium and synthetic getUserMedia: 17 PASS.
- `python tests/browser_v05.py --group camera-errors`: 13 PASS (timing adjusted for the new one-time retry).
- `python tests/browser_v04.py --group layout`: 234 PASS.
- `python tests/browser_v05.py --group effects-ui`: 16 PASS.
- `npm run package:web` PASS. GitHub workflow YAML files parsed and retain independent Android/Windows/Verify jobs.
- The retained two-cycle 10-second synthetic media browser test was attempted but exceeded the local execution time limit. It is **not counted as passed** in this hotfix; the independent 17-case media selection/probe test and earlier release recording evidence are not substitutes for it.

## Unverified

No physical Android device, Android WebView permission dialog, native APK compilation, actual phone camera/microphone, audio-video sync, USB webcam, Bluetooth printer, Hostinger deployment or Windows EXE was tested in this environment. Full long-duration browser suite and true-origin acceptance were not executed in this hotfix pass. This is not event-ready hardware acceptance.
