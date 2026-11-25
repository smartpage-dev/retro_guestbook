# RetroBooth v0.9.4-alpha.1 — Modern CRT frame and Android kiosk viewport tests

**Build basis:** The user-confirmed working v0.9.3 full GitHub-ready repository. **Date:** 2026-11-25. **Change scope:** 01 screen styling, geometry-sharing CSS, Admin/version touch target, cache/version metadata, related tests and deployment artifact naming.

## Implementation audit

- Reused all existing `heritage` cabinet geometry, inset, screen bezel, right panel width and responsive breakpoints for `edge` via shared `:is()` selectors. Heritage declarations/properties remain unchanged.
- Added style-scoped 01 graphite/silver modern CRT finish to `src/appearance.css`. No CSS filters applied to encoded source video; `edge` still uses existing Colour Film CRT shader.
- 01 version entry has contrast/visible touch border with additional safe bottom gap. `staffEntry` five-tap handler unchanged, still 2.2s timeout between taps. Top-left `CH 03` 5s press remains available.
- Updated Android versionCode **13**, versionName **0.9.4-alpha.1**, `.github` independent Android APK, Windows EXE and Verify workflow artifact naming, web service worker cache name, and derived Android/cloud/desktop web payloads.
- Device diagnostics, media controls, Bluetooth QR printing logic, cloud backend, guest recording/storage and theme IDs unchanged.

## Executed tests

| Test | Result | Scope |
|---|---|---|
| `tests/browser_v094_style_fit.py` | **170/170 PASS** | Chromium simulated CSS viewports 1920×1080, 1366×768, 1280×720, 1024×600, 960×540, 800×360, 770×360, matching style geometry, touch fit, user-facing five taps and JS errors |
| `tests/browser_v04.py --group layout` | **234/234 PASS** | Old general screen/layout regressions, including portrait fallback and Admin layouts; revised expected 01 bezel presence |
| `tests/browser_v04.py --group appearance` | **17/17 PASS** | Five taps, actual Admin style switch, unchanged event settings, matching geometry, no external requests |
| `npm test` | **PASS; desktop suite 46/46** | JS domain/desktop, media isolation, diagnostics, cloud and printer contract checks |
| `npm run test:native-core` | **57/57 PASS** | JVM simulated transport and filesystem tests for QR ticket journal |
| `tests/browser_v093_separated.py` | **34/34 PASS on retry** | Synthetic camera/microphone media separation and 10s encoded clip |
| `tools/verify-repository.py` | **PASS** | Three independent GitHub workflow source contracts |
| `npm run desktop:prepare` | **PASS** | Deterministic offline HTML build and desktop CSP assets |

**Important:** In a first combined test execution, the synthetic v0.9.3 clip test stalled after 26 checks and was terminated by a runner timeout. A standalone rerun then completed **34/34**; report both outcomes rather than claiming an uninterrupted full-suite pass. The full 25+ group Browser Regression Suite, real-origin cloud integration, physical printer and device soak were **NOT RUN** in this update. No native APK/EXE compilation or 32-inch Android hardware acceptance was performed here.

## Geometric validation

Across all seven landscape CSS viewports above, `01` and `02` `.television`, `.tv-bezel`, `#screen`, `.control-panel` bounds (`x`, `y`, `width`, `height`) matched to within **0.15 CSS px**; modern style cabinet and panel have a separate material finish. The version/Admin entry stayed at least **12 CSS px** clear of screen bottom and **8 CSS px** clear of right side in these simulated viewports. Real five-click entry was confirmed at 1280×720, 960×540 and 770×360. Browser snapshots retained in `qa/v094/`.

## Actual hardware acceptance still required

Install APK built by GitHub Actions on the 32-inch Android display, observe OS navigation/gesture bars and fullscreen, confirm all four sides fit, test version five-taps, preview via camera-only, recording with mic and QR result/return. If monitor uses unusual display scaling or overscan, export screenshots/diagnostics and report actual CSS viewport from Admin. Do not equate Chromium screenshots with Android real-device validation.
