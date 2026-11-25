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
