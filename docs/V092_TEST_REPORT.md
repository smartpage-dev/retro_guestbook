# RetroBooth v0.9.2 diagnostic build — scoped verification

Date: 2026-11-24. Based on the actual supplied v0.9.1 complete repository ZIP.

## Passed here

- `npm run desktop:prepare` and `npm test`: 46 desktop Node tests passed, plus the preceding core/effects/cloud/printer and new diagnostics privacy assertions.
- New browser diagnostics export (synthetic camera failure, browser-local save): 11 assertions passed; JSON contained error stage, runtime and redacted event history. No JavaScript errors.
- Retained Android camera selection/probe regression: 17 assertions passed using mocked `getUserMedia`.
- Retained Windows desktop controller mock regression: 20 assertions passed.
- Native printer JVM/filesystem core (fake Bluetooth transport): 57 assertions passed.
- PHP loopback private-cloud API: 84 assertions passed.
- Repository workflow/source preflight passed.
- Browser layout/appearance/storage contract groups of the full suite passed 234 + 17 + 14 = 265 assertions before the execution timeout interrupted the long flow group. **The full suite is NOT marked passed** and its partial results are not counted as complete acceptance.

## Not executed / not proven

- Android SDK compilation, real WebView native diagnostics bridge, real Android camera/microphone permissions, Android export picker, Android camera-busy root cause, and hardware endurance. The SDK/Gradle environment is unavailable here.
- Full 26-group browser regression suite; stopped during the two-cycle flow test by the local command timeout. The full suite remains required in the separate GitHub verification workflow.
- Windows EXE build/installation, physical SPP printing and live Hostinger deployment.

## Privacy and data retention

- Diagnostic exports are manual, JSON only, and sanitized for known private fields. They contain runtime, failure stage, Android permission outcomes and recent app-scoped events; not Android system logcat or raw media.
- Up to 500 browser events in the session; up to 250 sanitized events stored in browser localStorage for crash/restart troubleshooting; 200 native Android events in process memory. Native events are lost after process termination.
- The redactor cannot guarantee that every unusual error string is harmless. **Review before sharing**. No logs are uploaded automatically.
- Clearing diagnostic history does not delete video, cloud queues or app settings.

## Build notes

- Android app ID preserved (`studio.luce.retrobooth.preview`), versionCode increased from 10 to 11; Android test signing identity must match for an in-place upgrade.
- Android and Windows workflows remain independent, with separate Full Verification.
- No changes to the actual cloud PHP API, printer ticket ledger, or recorded video schema.
