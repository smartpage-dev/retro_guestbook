# RetroBooth v0.9.5 — Google Drive Event Mirror / Test Report

## Test scope
- Actual PHP Hostinger private-cloud API over local HTTP (104 existing regression checks).
- Drive bridge with in-process synthetic Google HTTP transport (16 scenario checks).
- Real Cloud Admin auth/failsafe with live local PHP HTTP (7 checks) and offline headless Chromium UI rendering at 390, 800, 1440 pixels (3 viewports); Chrome network to localhost is restricted in this environment, so UI Google API behavior is mocked. Actual admin.js client is executed.
- Existing Node/desktop unit suite, JVM print-core regression, PHP syntax, repository preflight and built web assets.
- ZIP integrity / patch-content consistency.

## Expected results
- `npm run desktop:prepare`, `npm test`, `npm run test:native-core`, `python tools/verify-repository.py`
- `python tests/cloud_api.py` — 104 legacy Cloud HTTP tests.
- `php tests/drive_pilot.php` — 16 checks, fake Google API calls only.
- `python tests/browser_v095_drive.py` — real PHP auth failsafe + offline Chromium UI assertions.
- `find cloud -name '*.php' -print0 | xargs -0 -n 1 php -l`.

## Not yet tested
- Authentic Google Account OAuth / One Pick, real Google Drive upload responses or their rate limits.
- Hostinger actual PHP CLI Cron, shared-hosting quota / outbound TLS / sustained video load.
- GitHub Android native compilation and 32-inch kiosk hardware acceptance.
- Native Windows EXE runtime / code signing / Google authorization on a live event.

**Assessment:** Pilot source ready for staging deployment and independent GitHub builds, NOT certified as a fully working commercial Drive integration.
