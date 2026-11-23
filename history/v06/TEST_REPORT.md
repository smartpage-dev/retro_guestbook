# RetroBooth v0.6 test and delivery report

21 November 2026 | 0.6.0-prototype.1 | TIMED_QR_SMART_RETURN_PREVIEW

## Current result

**709 scoped checks passed:** 560 browser assertions across 18 groups, 35 core + 61 delivery-policy + 32 effects checks, and 21 syntax/static contract checks. Every final browser group exited zero against standalone SHA-256 `7ffaa614d82287a0a493398df8270eef33a7942cde8b4a0dd4500f5231273ceb`. Historical reports are not included in this count. Independent QR decoding and archive/rebuild checks are reported separately, not added as inflated assertion counts.

| Browser group | Passed | Exit |
|---|---:|---:|
| browser_v02-privacy | 20 | 0 |
| browser_v02-receipt | 11 | 0 |
| browser_v02-recovery | 10 | 0 |
| browser_v04-appearance | 17 | 0 |
| browser_v04-flow | 28 | 0 |
| browser_v04-layout | 234 | 0 |
| browser_v04-media | 8 | 0 |
| browser_v04-storage-contract | 14 | 0 |
| browser_v05-camera-errors | 13 | 0 |
| browser_v05-effects-ui | 16 | 0 |
| browser_v05-native-export | 6 | 0 |
| browser_v05-pixels | 12 | 0 |
| browser_v05-webcam-synthetic | 21 | 0 |
| browser_v06-branches | 35 | 0 |
| browser_v06-layout | 82 | 0 |
| browser_v06-settings | 13 | 0 |
| browser_v06-timers | 14 | 0 |
| browser_v06-webcam-guard | 6 | 0 |

Names containing v02/v04/v05 identify retained regression scripts executed NOW against v0.6, not recycled old results. The final run used three concurrent scoped Chromium processes; the distributed standard runner remains sequential. Raw group logs, JSON and build hash are in qa/.

## Flow coverage

Timed QR after local save; both screen styles; direct return without additional thank-you; next clip gets a distinct QR; frozen settings; clear pixels/references; blocked duplicate Start and active settings changes; failed settings commit; connection-only/unknown/failed/sent-unconfirmed/timeout fallback; late simulation result guards; photo-only receipts; always-show and screen-only policies; zero-second confirmed-demo return; hidden-time expiry; pagehide and native-pause cleanup; real-capture refusal of demo print confirmation. Existing capture/save-recovery/receipt/privacy/effects/export tests also ran.

Two full 10-second demo loops and two full 10-second synthetic media recordings were rerun. Faster new branch tests deliberately stop demo capture after about 2.15 seconds using an exposed QA handler; they are not 10-second throughput measurements. Countdown timing is checked independently. The retained camera/effects, receipt composition and storage-engine source files are byte-identical to v0.5.

## QR and visual checks

Both style screenshots were independently decoded with OpenCV and matched the exact frozen local marker byte-for-byte. This verifies the generated PNG symbols, not physical paper, a live phone URL or a printer. The marker remains RETROBOOTH:LOCAL-PROTOTYPE:NO-ONLINE-VIDEO plus the clip ID.

The new hand-off was tested at 1920x1080, 1366x768, 1024x600, 800x360, 390x844 and 320x720 CSS viewports for both styles. An initial portrait overflow was reproduced, fixed with a compact two-column review layout, and the full suite rerun. The failed evidence is retained under qa/attempts; it is not counted as passed. Admin controls were checked at 1440, 800, 390 and 320 pixels wide. Actual screenshots were visually inspected; no generated mockups stand in for app screens.

## Synthetic recording and environment

The standard tests use Linux Chromium, opaque-origin set_content, a deliberate mocked BrowserStore, synthetic video/audio where needed, and the CPU/Canvas2D path. They do not establish real IndexedDB durability, native permission prompts, physical webcam routing, WebGL parity, Android frame rate, thermal endurance or lip sync.

Actual resulting synthetic MP4 files were read by FFprobe and a frame decoded by FFmpeg in this release; details are in qa/v06-ffprobe.json. They are VP9/Opus outputs of this environment, not an H.264 compatibility guarantee. No people or guest recordings are included.

A normal localhost integration attempt was blocked by the execution environment with ERR_BLOCKED_BY_ADMINISTRATOR. It completed **zero assertions** and is reported unavailable, not passed. No security bypass was used. The optional required localhost/IndexedDB CI test remains enabled by default in the workflow for an ordinary runner.

## Explicit non-results

No secure SPP/BLE/USB printing, physical receipt or snapshot raster, printer status telemetry, online guest page, upload server, staff authentication, remote projector, native crash recovery, actual Android compile/install/export, real event or GitHub Actions execution is certified. The print-success path is an explicit DEMO simulation; real captures cannot bypass QR in this release. No automatic retry is connected to a physical device. The handoff reference remains a manual LensDrop H5.3 pilot, not a newly integrated driver.

## Packaging, documents and preservation

The 11-page setup guide was rendered and visually reviewed page by page. The original v0.5 input ZIP and standalone are not overwritten. v0.6 retains the v0.5 database/schema and application ID; additive settings and new-clip snapshots do not rewrite old media. Rollback, source map and physical-adapter requirements are documented in docs/.

Archive CRC, full-source manifest hashes and clean-extracted rebuild byte equality must pass before release. Final evidence and hashes are in the delivered Package_Verification.json. The GitHub repository is not created/pushed, and APK/AAB outputs are not compiled here.
