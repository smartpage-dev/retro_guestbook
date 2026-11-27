## v0.9.8-alpha.1 — Android TV guest UI, bilingual Guest Page, Unicode tickets and new cabinet silhouettes (27 Nov 2026)

- Corrected RETROVISION subtitle text overflow on 32-inch Android control panel. Operator-defined TV maker/product/subtitle/channel can sync from Cloud Event Master. Guest-only engineering text is hidden by default; optional concise private-QR text and QR TICKET connected/not-ready status replace the former clutter.
- Local Admin Camera Lab: Auto/12/15/24/30 *maximum* processed FPS, selectable 360p/540p/720p rendering canvas. No promised frame rate: actual GPU/WebView throughput may remain lower; capture/encoded fps measured separately.
- Cloud Guest personal-video page now uses Cantonese/English bilingual prompts and permission labels. Private by default; independent show/delete toggles remain enforced by the cloud.
- Ticket Designer: 6 layouts (Classic, Cinema, Minimal, Premiere, 35mm Filmstrip, Memory Boarding Pass), browser portrait/landscape layout. **Physical 384-dot Android secure SPP prints portrait only; landscape cannot be guaranteed on 58mm paper.**
- Android native ESC/POS retains model-2 QR and adds bounded 384-dot 1bpp raster blocks for Unicode title/caption/footer on 58mm pilot printers. Actual Chinese print depends on host font rendering and printer GS v 0 support; no Bluetooth printer hardware acceptance, BLE, cutter, or confirmation of paper output.
- Three newly DISTINCT housings: rounded cream Space-age capsule, right-angle Broadcast Rack with rectangular record switch, and translucent cyan Y2K Jelly body. Retained Modern CRT and Heritage TV. Viewport-safe tests explicitly allow different outer silhouettes, including 5-tap Admin entry.
- V0.9.8: changed Web/CSS/Java/PHP Cloud definitions, Android Gradle versionCode 17; Cloud API remains PHP (no Node server), do not overwrite private config.php/data. Source and browser simulations do not establish real-device event readiness.

## v0.9.7-alpha.1 — Cloud Event Master, private consented slideshow, five TV bodies (27 Nov 2026)

- Cloud Admin event settings revisions, idle Android sync, duplicate-create protection, button loading feedback, ready-first recording list, protected JPG thumbnails, Play/Download/Share/View-only QR browser reprint.
- Guest Big-screen consent + deletion only exposed when event toggles are enabled; all flags default OFF. Slideshow requires guest consent plus staff approval (or event auto-approval after consent); rotating link revokes old access.
- Five TV bodies (three new: Space Age Ivory, Studio Broadcast, Y2K Bubble), eight independent look presets (four new: VHS, Sepia, Cinema, Night Vision), same safe layout.
- Private/cloud API security regressions 122, browser mocked Admin/Guest 15, style geometry 139. No Hostinger live deployment or Android hardware acceptance in this archive.

## v0.9.6-alpha.1 — Direct receipt print tests + true 4:3 / 16:9 photo raster (26 Nov 2026)

- Section 04 includes direct **Photo + diagnostic QR** and **QR-only** native Bluetooth ESC/POS test actions, using the current (even unsaved) draft fields. The Android confirmation dialog, transport journal and unknown-outcome safety remain in effect.
- When camera is unavailable, the photo test deliberately prints the compositor's labelled SAMPLE rather than claiming a live capture; the QR always targets `example.invalid`, never a guest link.
- Added per-event/per-clip ticket screenshot aspect setting: 4:3 default (384×288 1bpp) or 16:9 (384×216 1bpp) for actual paper, save-point JPEG, and browser receipt preview. T−2 still the default capture moment.
- Retains 384×336 8:7 raster decoder and unmodified fingerprint behavior for previously saved v0.9.5 guest clips / ticket journal history.
- Native QR remains an independent Model 2 ESC/POS command. New printed ASCII title/caption/footer and cinema header are **not a pixel-perfect match** for screen preview; Chinese font/logo output and printer cutter not implemented.
- No printer paper sensor. `sent_unconfirmed` is an output-stream result only. Source and mock validations completed, Android build and physical paper acceptance still outstanding.

## v0.9.5-alpha.1 — QR ticket bitmap and configurable countdown capture (26 Nov 2026)

- Android secure-SPP test ticket now supports a 384x336 dithered monochrome LIVE still + native model-2 QR (GS v 0 bitmap format); QR-only diagnostic retained. No cutter/status sensor.
- Admin Photo + QR test uses current applied camera and a non-working `example.invalid` test QR; manual saved cloud tickets use **frozen** per-clip image and existing capability URL.
- Guest ticket still captured at countdown T-2 by default (configurable T-1/T-2/T-3) independently of recording best-shot; if countdown disabled, fallback REC START. Settings and still saved locally with the clip.
- WebView print channel increased only for photo print/test operations to 30KiB max; other commands remain at 4KiB. Native raster validated before journal reservation.
- Print IDs remain idempotent: photo hash/moment are journaled only as fingerprint; old QR-only journal data remains readable. No automatic retry after an unknown outcome.
- 12s recommended default Bluetooth ticket deadline for new installations; existing saved value is preserved. Photo receipts cannot fast-return; on-screen QR remains fallback.
- Physical printer and Android native compilation unverified in authoring environment; mock JVM/browser tests are not paper acceptance.

## v0.9.5-alpha.1 — Modern CRT framing and kiosk-safe UI (25 Nov 2026)
- Both screen styles now share the *same physical cabinet layout* and responsive breakpoints, derived from the working Heritage TV design.
- Replaced the exposed edge-to-edge style 01 with graphite/brushed metal 1990s CRT housing and modern side panel; retains the existing Colour Film effect on recorded frames.
- Raised 01 bottom-right five-tap Version/Admin affordance into a touch-safe bordered area; short-landscape CSS viewport reductions.
- Kept 02 Heritage TV and camera/microphone media logic unchanged.
- Bumped Android versionCode 13, unified release names and independent APK/EXE CI workflow artifact labels.
- Added viewport/regression verification; see docs/MODERN_CRT_V094.md.

## v0.9.3-alpha.1 - 25 Nov 2026 - Android camera-only live preview + separate microphone

- Camera-only live CRT preview (video:true,audio:false) operates when mic initialization fails; microphone separately requested (video:false,audio:true) and can later be attached or released without losing camera.
- Combined Apply now executes two independent acquisition steps; Android mic failure is reported and logged separately, leaving camera live and guest Start locked.
- Native Android install-time MODIFY_AUDIO_SETTINGS permission added; transient runtime permission-dialog pause no longer suspends WebView, with background onStop safety and deferred grant until resume.
- Full diagnostics now include separate cameraReady / microphoneReady / partialPreview fields and precise camera/mic failure stages. Camera Lab labels and 390px mobile controls improved.
- Same app ID and storage; Android versionCode12, Windows cloud backend unchanged. Native Android compile/hardware camera and mic acceptance still pending.

## 0.9.3-alpha.1 — Android diagnostic export

- Bounded in-memory app event log, camera/mic stage timings and sanitized failures.
- Android native permission and lifecycle event snapshot, Android/WebView version, explicit export in Admin.
- Preserves split APK and EXE workflows; no camera hardware fix claimed.

# v0.9.0-alpha.1 - ANDROID_WINDOWS_GITHUB_BUILD

- Adds restricted Electron desktop source, installer/portable Windows targets, native export and per-user storage profile.
- Adds manual combined Android/Windows workflow, platform artifact separation, APK signature check and required desktop runtime/packaged x64 smoke gates.
- Retains Android secure-SPP QR pilot and app ID; versionCode 9. No Windows printer implementation.
- Adds exact desktop origin to new cloud config templates; existing live config is never overwritten.
- Adds updated operator guide, quick starts, current tests and migration instructions.
- Native APK/EXE compilation/runtime and physical acceptance were NOT performed here. See current test report.

## Historical release notes

# Changelog

## 0.8.0-alpha.1 - ANDROID_SECURE_SPP_QR_PILOT
- Independent Android QR-only secure-SPP source, paired address pinning and native session consent.
- Durable hash-only ticket journal before send, duplicate suppression, explicit same-link reprint, bounded cancellation and revocation.
- Safe timed QR default; optional operator-accepted unconfirmed-paper fast return, separate from DEMO or physical confirmation.
- New Admin printer panel, masked scan observation, UI state-refresh serialization and current status labels.
- Added JVM core, Node bridge and mocked browser regression tests; updated build workflow and 17-page guide.
- Existing webcam/effects/storage/receipt/PHP/guest scripts preserved. Same Android App ID and DB; versionCode8.
- No H5.3 port, native snapshot/raster/cutter, compiled APK, physical printer test, deployment or native crash-safe media engine.

## 0.7.0-alpha.1 - PRIVATE_CLOUD_DELIVERY_ALPHA
- Opt-in PHP single-host private media service and distinct Cloud Admin.
- Separate owner/view credentials in fragments, short-lived media cookies, authenticated Range streaming.
- Pre-reserved QR pool with atomic consumed-ID ledger; fixed per-capture event/device/server identity.
- Idle chunk upload, per-chunk and final SHA-256, retry/resume, no automatic local deletion on upload.
- Remote Hide/Allow and reconfirmed Delete; durable tombstones before file removal; explicit offline-local-cleanup status.
- New UI/HTTP/client/storage tests, cloud deployment ZIP, updated GitHub workflow and guide.
- Fixed BrowserStore deletion-ack handler being overwritten by generic request handling.
- Bundler now uses replacement callbacks so JavaScript dollar patterns cannot alter inserted source.
- Single-host locked JSON metadata is an explicitly limited pilot alternative to the original MySQL plan.
- Original v0.6 source/HTML preserved; browser schema and Android application ID retained; Android versionCode 7.

No new physical printer driver, remote projector, native recorder or precompiled APK. Reference H5.3 archive could not be retrieved with authorized raw-byte access; its driver was not reimplemented from old summaries.

Older release records remain in history/. They are not current test evidence.

## v0.9.6 source integrity repair (2026-11-26; no app versionCode change)
- Canonical Git-repository content audit: 190 critical source files with reproducible SHA-256 checks; safe GitHub Desktop source staging helper, plus automatic fast preflight on push.
- Rebuilt stale package SHA-256 manifest after source/workflow changes; replaced Android artifact metadata's stale versionCode 13 with Gradle-derived versionCode 15.
- Android, Windows, and Full Verification retain independent manual workflows. No camera/receipt/printer behavioral modifications. Native APK/EXE builds and real thermal printer output remain external acceptance steps.
