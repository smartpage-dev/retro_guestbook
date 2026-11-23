# RetroBooth v0.5 test and delivery report

19 November 2026 | 0.5.0-prototype.1 | STYLE_LINKED_CAMERA_LOOKS_GITHUB_BUILD

## Verified locally

**410 browser assertions across 13 groups**, all final child processes exit 0; **35 core + 32 effect assertions**; **18 syntax/static-contract checks**. These are 495 scoped checks, not device acceptance or production certification. Final application SHA-256: `aeb8741cebf730dbb5d45ddf72ebe26bc3aa03664791a2203eb793f5a7f89934`.

| Browser group | Passed | Exit |
| --- | ---: | ---: |
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

The v02/v04 filenames are retained regression suites run against the NEW v0.5 bundle, not recycled results from earlier releases. Final suite output is `qa/suite-results.json`; individual final logs are included.

## Effects and actual encoded test media

Film keeps subdued colour; Heritage resolves to a near-monochrome warm/olive profile. Both use moving noise and configurable scanlines. Each profile is independently retained; follow/manual selection, draft/discard, save failure and busy-state guards were exercised. A raw Admin comparison does not switch the recording source. Saved clips carry a detached camera-look snapshot.

CPU pixel probes compare output with the shared colour matrix, verify changing noise across time, horizontal row darkening and neutral black-and-white. The visible Canvas2D capture surface is stable; an optional offscreen WebGL2 stage uses the same colour transform, but WebGL execution/parity was NOT validated in this environment.

Two complete fixed 10-second controller sessions used an explicitly synthetic colour chart plus 330 Hz audio, injected through a test-only getUserMedia fixture. Both produced finalized playable files:

| Shell / look | Decoded picture | File bytes | Container / streams | Decoded duration |
| --- | --- | ---: | --- | ---: |
| Edge / Colour Film CRT | 1040 x 720 | 3,027,935 | MP4 / VP9 + Opus | 9.978667 s |
| Heritage / Heritage Soft Mono | 1074 x 720 | 2,750,045 | MP4 / VP9 + Opus | 10.005967 s |

The controller timing was 10,022 ms and 10,020 ms. Playback advanced in Chromium; FFprobe independently inspected streams and FFmpeg decoded frames. Decoded frames were visually inspected: effects are in the pixels, no TV cabinet/START/REC overlay is encoded, and the synthetic text reads unmirrored. This does NOT establish real-camera skin rendering, speech quality, lip sync, H.264 availability, Android playback or a guaranteed output frame rate. Headless render/encode rates are not hardware performance benchmarks.

## Test environment and exclusions

Linux Chromium, Playwright set_content, opaque origin, CPU compositor. Browser persistence and getUserMedia permission behavior are mocked where needed and are labelled in each test. No app production code overrides browser security or storage restrictions.

A real localhost/IndexedDB integration attempt returned `ERR_BLOCKED_BY_ADMINISTRATOR` before the page loaded. It is recorded as **UNAVAILABLE, 0 checks**, not passed, and was not bypassed. `tests/real_origin.py --require-origin` is included in GitHub Actions by default; the workflow must successfully execute it on the runner before that extra coverage can be claimed.

An earlier foreground synthetic webcam run timed out before completing its second cycle; it is not counted. The final monitored group completed both cycles with 21 passes. Screenshot generation initially needed the explicit installed Chromium path; final clean previews were generated with `/usr/bin/chromium`.

Real Android/USB webcam/microphone/handset, physical camera permissions, native IndexedDB durability, app process-kill recovery, low-disk behavior, physical printer, cloud delivery, guest online URLs, authenticated Admin and cross-device projector revocation remain unverified or unimplemented. This is not event-ready.

## Android and GitHub status

Android Java/WebView source, pinned Gradle/AGP configuration, trusted-origin camera permission handling and a chunked document-export bridge are included. The bridge's JavaScript sequencing/cancellation was tested with a fake reply channel; native Java was NOT compiled or executed.

No Android SDK/Gradle dependency access was available in this environment. No APK/AAB is supplied as a successfully compiled artifact. The manual GitHub workflow is prepared for Web packages, TEST APK and unsigned release APK/AAB, but has NOT been run in the user's GitHub account. Initial native lint/compile, install, permissions, exported-file verification and hardware acceptance remain gates.

Without a persistent test keystore, runner debug signing may change between builds. Export recordings before any uninstall or data reset. Signing instructions explain the optional private test secrets; no private keys are included.

## Data, privacy and packaging boundaries

v05 uses a separate browser database and update channel. There is no v04 automatic migration, no live deployment, and no modified old installation. The existing guest hide/delete and local-show tests remain local-only. QR values still explicitly say NO ONLINE VIDEO. Receipt generation is not paper printing.

Web/Hostinger/local-test ZIPs are built locally. GitHub Ready is editable source, not a compiled Android app. Package CRC, per-file manifest and clean extracted build comparisons are recorded separately in `RetroBooth_v0.5_Package_Verification.json` delivered beside the files. The operator guide is an editable 10-page Word document, rendered and visually checked before delivery.

Clean previews show an explicitly labelled synthetic test chart. They are actual program screenshots, not webcam photos or generated UI mockups. The repository contains no real guest media.
