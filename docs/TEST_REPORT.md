# RetroBooth v0.9 - Build package verification report

23 November 2026 | 0.9.0-alpha.1 | ANDROID_WINDOWS_GITHUB_BUILD

## Delivered scope

An editable Android/Windows GitHub build repository, an updated web bundle and a 9-page operator guide. New Windows Electron source supplies an installer and portable target, narrow native host operations, per-account storage and export handling. Android native Java/SPP code is retained; versionCode is 9. Windows printing is explicitly not implemented.

**No APK or EXE was compiled or executed here. No GitHub workflow was run in the user's account.** Native binary filenames describe outputs of the required future successful CI jobs, not files already present in this delivery. No deployment, signing certificate, physical camera/printer or event acceptance is claimed.

## Current executed evidence

| Group | Passed | Method |
|---|---:|---|
| Browser regressions including Windows UI adapter | 686 | 25 current-bundle Chromium groups, all exit 0 |
| Retained JavaScript unit/client/mock-store checks | 205 | Node, current source |
| New desktop security/asset/config tests | 46 | Node test runner, actual local files; no Electron runtime |
| Syntax/static contracts | 29 | Existing source validator, not SDK compilation |
| Native ticket-core checks | 57 | Actual JVM and temporary filesystem; fake transport |
| PHP API integration | 84 | Actual PHP loopback HTTP and private files |
| Total scoped checks | 1107 | Different evidence types; not 1107 end-to-end device tests |

PHP syntax lint (five files), Python/YAML parsing, repository-shape validation, Word visual inspection and packaging checks are separate and not added to the total. An initial desktop-CSP assertion failed because its test split retained whitespace; the assertion was fixed and all final unit tests rerun. Its failed log is under qa/attempts, not counted as a pass.

Final standalone SHA-256: `e73c2f3ccc0055e5a54631d339d4f42b973b9a0021f8f39cdc05ceebc886639b`.

### Current browser groups

| Group | Assertions | Exit |
|---|---:|---:|
| browser_v04-storage-contract | 14 | 0 |
| browser_v04-appearance | 17 | 0 |
| browser_v04-media | 8 | 0 |
| browser_v04-layout | 234 | 0 |
| browser_v02-privacy | 20 | 0 |
| browser_v04-flow | 28 | 0 |
| browser_v02-recovery | 10 | 0 |
| browser_v05-pixels | 12 | 0 |
| browser_v05-effects-ui | 16 | 0 |
| browser_v05-camera-errors | 13 | 0 |
| browser_v05-native-export | 6 | 0 |
| browser_v02-receipt | 11 | 0 |
| browser_v06-settings | 13 | 0 |
| browser_v06-timers | 14 | 0 |
| browser_v06-branches | 35 | 0 |
| browser_v05-webcam-synthetic | 21 | 0 |
| browser_v06-webcam-guard | 6 | 0 |
| browser_v07-guest | 14 | 0 |
| browser_v06-layout | 82 | 0 |
| browser_v07-admin | 12 | 0 |
| browser_v08-printer-ui | 21 | 0 |
| browser_v07-booth-cloud | 32 | 0 |
| browser_v09 | 20 | 0 |
| browser_v08-deadline-manual | 13 | 0 |
| browser_v08-native-flow | 14 | 0 |

All historical-name regression scripts ran against this current v0.9 HTML. Names containing v02/v04/etc do not mean old pass results were reused. The authoring runner used three monitored test processes; the distributed workflow uses the sequential runner plus the new v09 group.

The Windows UI test injects a labelled MOCK RetroDesktop bridge and verifies visible desktop controls, disabled Windows printer controls, bounded layouts at 1440/800/390/320 widths, effect retention, host callbacks and suspend/export handling. The mock does NOT execute desktop/main.cjs, native dialogs or an EXE. Actual screenshot samples were inspected.

### Backend CORS extension

The 84 real PHP checks include the previous full private-upload/deletion/isolation tests plus six desktop-origin cases: exact custom origin accepted, authenticated-request preflight, lookalike origin rejected, opaque null origin rejected, unauthenticated device still refused, authenticated device accepted with the exact origin. They use a temporary test configuration and real loopback HTTP, not a running Electron client, Hostinger, HTTPS or a physical phone.

## Native execution gates still open

Electron and its Windows packaging dependencies could not be downloaded here (registry DNS EAI_AGAIN); Android SDK/Gradle are not installed. No npm lockfile was fabricated. Direct Electron45.4.1 / electron-builder26.18.0 versions are pinned; first CI resolves transitive packages and uploads its generated desktop/package-lock.json for review and commit. Later installs use npm ci when that reviewed lock exists. Full transitive reproducibility is not yet claimed.

The workflow requires source/browser/private-cloud checks before native jobs. Android compiles debug/release/AAB, runs lintDebug, verifies TEST APK signature and package/version metadata. Windows runs actual Electron smoke with synthetic getUserMedia and a disposable real storage profile, packages both EXEs, then launches the packaged x64 app through the same smoke gate. Those tests are implemented but unexecuted here. Optional ARM64 is cross-built on an x64 runner; the ARM64 executable is not run there.

The two real-local-origin browser probes were attempted and blocked by this environment's `ERR_BLOCKED_BY_ADMINISTRATOR`, before executing assertions: **zero checks, not a pass**. Logs are qa/current-true-origin.log and qa/current-cloud-origin.log. No workaround or access-control bypass was used. Both true-origin tests remain required in GitHub Actions.

## Platform and data limits

Standard authoring browser tests use Linux Chromium set_content, Canvas2D, mocked storage/cloud/native bridge and synthetic media. They do not establish native permissions, real IndexedDB durability, WebGL behaviour, lip sync or sustained performance. Source static tests do not establish Electron APIs executing correctly. Runtime/packaged x64 smoke on CI is therefore a mandatory remaining gate, followed by physical device testing.

Windows EXEs are unsigned test outputs. Android TEST signing is temporary unless the four persistent key secrets are supplied. Existing recordings must be exported before uninstall/reset/signature changes. Windows introduces a new custom origin/profile, not a Chrome/Android migration. Installed and portable Windows editions share the same Windows-user profile; moving an EXE does not copy local media. Use separate cloud device identities per physical installation.

Windows Bluetooth/USB/RAW ticket printing is not implemented. Android SPP remains QR-only, no snapshot/logo/Chinese/raster/cutter; sent_unconfirmed is not paper confirmation. The receipt designer remains a preview. Fullscreen is not OS kiosk lockdown. Recording still relies on MediaRecorder/IndexedDB and is not process-kill/power-loss certified. Remote projector and account/MFA remain outside this release.

## Preservation and document review

The original v0.8 ZIP was hash-verified unchanged. Capture renderer, colour math, store engine, receipt renderer, PHP service, guest/Admin scripts and all existing Android Java files are byte-identical to the actual baseline. See SOURCE_PROVENANCE.json and the focused patch. Database name/schema and Android application ID retained. Existing server config is not modified; only templates add the exact desktop origin.

The new Word guide rendered to nine pages; every page was visually inspected. No rendered page images or fonts are supplied as deliverables. Current text guides, per-platform quick starts and operational v0.8 history are included.

## Packaging

The release gate checks ZIP CRC, all source-manifest SHA-256 values, exclusions of live config/data/signing files, and a clean-extracted rebuild of standalone HTML, desktop asset hash/CSP manifest and all three Web/Cloud ZIPs. Results and final archive hashes are in the separate Package_Verification.json. These checks do not prove a native binary build.
