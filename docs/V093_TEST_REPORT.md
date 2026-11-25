# RetroBooth v0.9.3 — Independent Android media fix / test report

25 November 2026 | `0.9.3-alpha.1` | versionCode 12 | previous source: v0.9.2 compile-fix full root ZIP.

## Implemented

- Independent `getUserMedia({video:..., audio:false})` and `getUserMedia({video:false, audio:...})` controls. A successful camera track is retained when a microphone request fails; two-stage attempts never use combined A/V constraints.
- Explicit `preview` mode with real CRT preview; no guest Start, session, receipt, upload, print or live-show ticket issued in partial mode. The script also guards programmatic/handset Start.
- Microphone-only selection can attach to a previously opened camera without reopening it; mic-only release preserves video. Reconnecting a failed audio input does not silently replace an explicitly selected device.
- In Android, `MODIFY_AUDIO_SETTINGS` was added to the manifest, and the runtime-permission-dialog lifecycle now avoids pausing WebView during the temporary system prompt while still suspending in `onStop`. Deferred grants are rechecked after Activity resume. Same origin and runtime permission checks remain.
- Existing diagnostic JSON now includes `cameraReady`, `microphoneReady`, `partialPreview`; stage-specific camera/mic errors logged. Mobile controls have clearer labels.
- Android versionCode increased from 11 to 12; package name and cloud API unchanged. Windows build workflow retained separately.

## Executed tests (not actual devices)

- `npm run desktop:prepare`: PASS (built fresh desktop hash/CSP assets).
- `npm test`: PASS (JavaScript domain, cloud-client, storage, printer, desktop security; new media-separation static contracts). Desktop suite **46/46**.
- `npm run test:native-core`: PASS **57/57** portable JVM ticket-core filesystem checks with fake printer transport.
- `python tools/verify-repository.py`: PASS (three independent workflows and new source files present).
- `CHROMIUM_PATH=/usr/bin/chromium python tests/browser_v093_separated.py`: **34/34 PASS**. Synthetic video/oscillator + mocked storage; tested camera-only preview, persistent video after mic failure, logs export, sequential recovery, independent mic attach/release, locked guest Start, 10-second encoded A/V clip, mic-only path, mobile/landscape layout.
- Earlier in this same development: `browser_v091_camera.py`: **17/17 PASS**, `browser_v092_diagnostics.py`: **11/11 PASS**, `browser_v05.py --group camera-errors`: **14/14 PASS** before the final minor sequential-reuse adjustment. Tests remain in repository and the full verification workflow for rerun.
- `browser_v05.py --group webcam-synthetic` full two-clip suite was **NOT completed** in this environment: the longer runner timed out after its first clip, so it is not counted as a pass. The new v093 test did encode one complete 10-second synthetic clip successfully.
- Native Android MainActivity compile / APK install / Samsung or second phone microphone / Android System WebView routing: **NOT RUN HERE** (Android SDK and physical devices unavailable). No guaranteed fix for this hardware fault; do the device checks in the guide.
- GitHub Actions execution, Electron install/package, BLE/SPP paper, Hostinger deployment and real-origin/cloud-browser tests: **NOT RUN HERE**. Backend modules retained from v0.9.2; no new backend security claim.

## Hardware acceptance needed

Build the TEST APK from GitHub, retaining the previous signing identity. On both phones test Camera-only, microphone-only, sequential Apply, change Front/Rear, permissions prompts, app Home/resume, and record a true 10-second voice clip. Export diagnostic JSON on failure and check its stage, error, native events. Confirm a silent fake/guest clip is not created when mic is unavailable. Review a complete downloaded local video with lip-sync before public events.
