# RetroBooth v0.8 test and delivery report

23 November 2026 | 0.8.0-alpha.1 | ANDROID_SECURE_SPP_QR_PILOT

## Release scope

Independent native Android secure-SPP QR-only implementation on the actual v0.7 source. This is a source/web delivery, **not a compiled or physically validated Android APK**. No Hostinger deployment, GitHub repository push/Actions run or printer installation took place.

The inaccessible H5.3 archive was not ported or treated as tested code. Its short supplied handoff requirements were used as constraints; no inherited hardware evidence is claimed. The paper profile intentionally excludes snapshot, logo, Chinese, custom receipt-designer layout, cutter and status commands. The existing receipt canvas remains an artwork preview/export, not native raster output.

## Current executed result

**1035 scoped checks passed**: 666 browser assertions in 24 groups; 205 JavaScript unit/client/mock-storage assertions; 29 syntax/static contracts; 57 actual JVM/private-filesystem ticket-core checks with a fake transport; 78 actual PHP loopback HTTP/private-filesystem checks. Five PHP syntax lints and Python/YAML parse checks are separate and not added to this count.

Final standalone SHA-256: `8886976d30ec16b1cddd3d29d5f5f7f3475150564ad58ec61a8406a38c216986`.

| Browser group | Assertions | Exit |
|---|---:|---:|
| browser_v04-layout | 234 | 0 |
| browser_v04-appearance | 17 | 0 |
| browser_v04-storage-contract | 14 | 0 |
| browser_v04-flow | 28 | 0 |
| browser_v04-media | 8 | 0 |
| browser_v02-privacy | 20 | 0 |
| browser_v02-recovery | 10 | 0 |
| browser_v02-receipt | 11 | 0 |
| browser_v05-effects-ui | 16 | 0 |
| browser_v05-pixels | 12 | 0 |
| browser_v05-camera-errors | 13 | 0 |
| browser_v05-native-export | 6 | 0 |
| browser_v05-webcam-synthetic | 21 | 0 |
| browser_v06-settings | 13 | 0 |
| browser_v06-branches | 35 | 0 |
| browser_v06-timers | 14 | 0 |
| browser_v06-layout | 82 | 0 |
| browser_v06-webcam-guard | 6 | 0 |
| browser_v07-booth-cloud | 32 | 0 |
| browser_v07-guest | 14 | 0 |
| browser_v07-admin | 12 | 0 |
| browser_v08-printer-ui | 21 | 0 |
| browser_v08-native-flow | 14 | 0 |
| browser_v08-deadline-manual | 13 | 0 |

Retained scripts named v02/v04/v05/v06/v07 ran against the current final bundle. Their old release pass counts were not reused. The monitored authoring runner used three concurrent processes; the distributed runner is sequential. Current logs/JSON are under qa/final-* and qa/suite-results.json. Superseded/failed attempt evidence is isolated under qa/attempts and is not counted.

## Native core: what actually ran

`javac --release 17` and the JVM executed the four platform-independent printing classes against real temporary files. Tests cover exact native QR bytes including the capability fragment, command injection/host/path/length rejection, durable pre-write intent, file lock, duplicate suppression across reconnection, immutable same-link reprint, process-interrupted recovery, corruption failure, expiry, cancellation, partial/flush uncertainty, revocation, hash-only privacy, and default/connection-bound/expiry fast-return policy. Socket operations are a fake Link, not Android Bluetooth. Full MainActivity/NativePrinter SDK compile, native dialogs, lint and installation remain open.

Official Android SDK/toolchain download could not resolve in this environment; no SDK/Gradle native build was completed. See qa/android-toolchain-availability.log. The GitHub workflow includes assembleDebug, assembleRelease, bundleRelease and lintDebug plus JDK17/Gradle8.11.1/SDK35. Expected output names are not proof those files exist.

## Browser scope and new scenarios

Linux Chromium via Playwright `set_content` at an opaque origin; Canvas2D path, explicit mocked storage/cloud and a labelled MOCK native bridge. New UI fixtures execute no Java Android code. The native-flow group tests a complete ten-second synthetic camera/audio recording followed by the frozen-ticket request, default screen fallback, accepted-transport bypass, always-screen override, duplicate rejection, bad result hash and unknown outcome. Other branch cases use deliberately abbreviated recordings and are not throughput benchmarks.

The deadline/manual group tests request-targeted cancellation, late response isolation, selected older recording (not current/newest), explicit same-link reprint, cleared scan input, safe-default restoration and pause reset. The first version exposed staff buttons before the status refresh completed. The controller now keeps the staff operation locked through refresh; the complete final suite was rerun and passed. An early foreground native-flow run hit the tool wall-time limit and is not a pass.

No real permission dialog, IndexedDB restart durability, actual native bridge origin enforcement, secure SPP connection, paper scan, printer queue, Android performance, WebGL parity, heat/endurance or physical lip sync is established by these browser checks.

## Real-origin and backend

Both normal local-origin browser attempts were made without bypasses and were blocked by `ERR_BLOCKED_BY_ADMINISTRATOR` before executing assertions. They completed **zero checks**, not a pass. Logs are qa/final-real-origin.log and qa/final-cloud-real-origin.log. Required real-origin checks remain ON by default in GitHub Actions; do not disable them to call the release validated.

The retained PHP API test used a real PHP server and temporary private filesystem, not a mock. All 78 assertions passed, including role isolation, immutable chunk upload, integrity, Range media, delete-before-cleanup, delayed upload rejection and revocation. This is not Apache/Hostinger/HTTPS/CORS or phone acceptance. The backend remains byte-identical v0.7 and deliberately reports printer:not_connected because Bluetooth is local to Android.

## Safety interpretation

`sent_unconfirmed` only records that write/flush returned. No paper sensor or confirmed-print state is implemented. Default native result keeps the timed QR. An optional native dialog accepts operator-observed exact-link transport risk for the current connection/origin/profile/observed URL length and up to four hours. It can still skip QR when paper runs out or is unreadable. It is OFF by default and resets on pause/disconnect/failure. A pasted URL is an operator declaration, not proof a real phone scanned paper.

The native journal is persisted before sending, stores hashes not private URLs/media, and never auto-replays unknown jobs. The original QR-owner link allows Delete; keep paper private. Deletion processed by the booth revokes further ticket jobs; already sent bytes, paper and downloaded copies cannot be recalled. No new photo-print entitlement or other project's H5 job schema is introduced.

## Visual / documents / preservation

Actual new Admin browser screenshots were inspected at 1440 and 390 widths, with native-unavailable messaging. All retained layout tests ran. Mock-native screenshots are explicitly test evidence, not physical-device evidence. The 17-page Word guide was rendered and every page visually inspected. Rendered page PNGs are internal QA, not delivery artifacts.

The v0.7 source ZIP/HTML remain unchanged. Capture renderer, colour effects, storage engine, receipt renderer, cloud PHP service and cloud guest/Admin scripts are byte-identical to baseline; provenance records their hashes. Browser DB/schema and Android App ID remain, versionCode8. No media migration, live credential edits or deployment took place.

## Packaging gate

The release gate verifies every ZIP CRC, source-manifest hashes, excluded config/data/keystores, and an extracted clean rebuild of standalone HTML plus all three web/cloud ZIPs. See delivered Package_Verification.json for the actual final results/hashes. Hash equality does not substitute for Android compilation or paper acceptance. Guide sections12-16 contain the actual-device acceptance checklist.
