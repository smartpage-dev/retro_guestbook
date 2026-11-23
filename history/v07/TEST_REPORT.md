# RetroBooth v0.7 verification and delivery report

23 November 2026 | 0.7.0-alpha.1 | PRIVATE_CLOUD_DELIVERY_ALPHA

## Result and scope

**894 scoped checks passed:** 618 browser assertions across 21 groups, 198 Node core/effects/delivery/cloud/store/static checks, and 78 actual PHP/HTTP integration assertions. Five PHP files also passed syntax lint. QR PNG decoding, document visual QA and archive checks are separate, not inflated into this assertion total.

Final standalone SHA-256: `043ce64910f313af300aa6b13a859d01255dd3fd0c08b703c4c6a237956134dc`.

This is a private-cloud pilot with a local-first browser booth, not an event-ready release. No website was deployed, no GitHub repository/Actions run was performed, no APK/AAB was compiled, and no physical camera/phone/printer/Android installation was certified here.

## Executed browser groups

| Group | Assertions | Exit |
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

Names containing v02/v04/v05/v06 are retained test scripts executed against the CURRENT v0.7 bundle, not historical pass counts. Raw final logs are in qa/final-*.log and qa/suite-results.json. The retained runner used three concurrent monitored processes; the distributable standard runner remains sequential. New v07 groups also completed with exit zero.

The new cloud booth group includes one complete 10-second synthetic camera/audio recording, local commit before QR, exact frozen owner link, duplicate Start suppression, no new upload requests during capture/QR, idle transfer completion, local-file retention, Hide synchronization and remote Delete cleanup/acknowledgement. It now checks that the panel and library show correct cloud status rather than inherited local-only labels. Existing real-duration cycles, synthetic recordings, effects, receipts, failures and privacy tests were rerun.

### Important browser limitations

Browser tests use Linux Chromium set_content at an opaque origin. Network/storage are explicit fixtures; synthetic canvas/audio replace cameras. The v07 fixture supplies a SHA-256 shim to the Python test process because native SubtleCrypto is not available at that origin. The actual BrowserStore cloud claim/acknowledgement methods are separately exercised against a transaction mock, not real IndexedDB durability. Guest/Admin scripts are loaded inline with the page CSP removed only in the test harness; deployment CSP, TLS, cookies, CORS and ordinary page navigation are NOT proven by those UI checks.

A normal real-localhost browser test was attempted in this turn and failed with `ERR_BLOCKED_BY_ADMINISTRATOR`, completing zero assertions. No access-control bypass was used. `tests/real_origin.py --require-origin` and the new `tests/cloud_real_origin.py` remain required by default in GitHub Actions. The latter was syntax-checked here but not executed; its success is a remaining integration gate. Physical webcam routing, native permissions, WebGL execution, audio/video lip-sync, Android performance and prolonged thermal stability remain unverified.

## Actual PHP backend tests

`tests/cloud_api.py` ran against PHP 8.4.24 on loopback HTTP using a real temporary private filesystem and four PHP development-server workers. This is NOT a mock API test, but also NOT Hostinger/Apache/HTTPS validation. Test secrets live only in temporary fixtures and are not deployment credentials.

The 78 checks cover authenticated Admin/device/guest roles; unexpected origin/host rejection; owner versus read-only capabilities; device/event isolation; independently closing new reservation issuance versus upload draining; immutable upload metadata; per-part SHA-256 and length; repeat and conflicting chunks; concurrent duplicate requests; ordered merge and whole-file integrity; authorized media range/HEAD/suffix/If-Range behavior; private file path rejection; Hide/allow without auto-approval; reconfirmed Delete; pending local purge/acknowledgement; late upload and completion refusal after deletion; event expiry and cleanup; device revocation; missing/corrupt initialized state failing closed rather than resetting.

The upload fixture is a generated H.264/AAC test clip with a legal MP4 free box to exercise multiple 512 KiB chunks. Header recognition on the server is not full codec validation, transcoding, malware scanning or universal phone playback proof.

## QR, visuals and documents

The new kiosk QR PNG was independently decoded with OpenCV and matched the exact frozen fixture URL byte-for-byte (99 UTF-8 bytes). Its example.test destination is deliberately a MOCK address, not a usable online recording. Tests do not validate physical paper, thermal output or a real phone scanner. Default unconfigured installations retain explicit NO ONLINE VIDEO markers.

Actual screenshots of the guest waiting/delete UI, Booth cloud setup and timed QR were visually inspected. New controls were checked at 1440/800/390/320 CSS widths, and the retained kiosk/QR viewport coverage was rerun. There are no AI-generated mockups standing in for screenshots. The Word guide was rendered to 12 pages and every final page inspected; page PNGs/PDF are internal QA outputs rather than requested deliverables.

## Storage and privacy boundaries

The backend intentionally uses single-host private files and cooperative locks, not the original plan's MySQL. Default logical quota is 2 GiB, clip cap 64 MiB, and identity/event caps are documented. Atomic same-directory rename and fsync improve file persistence but do not constitute platform-independent power-loss certification. The hosting filesystem, writable private directory, lock behavior, reverse proxy, TLS and Cron must be accepted on the deployment host.

Cloud is OFF initially. Connecting an event does not enroll old local videos. A finite pre-reserved pool (12 links initially) supports offline capture; an exhausted pool stops cloud-mode Start unless an operator explicitly selects local-only. Cancelled/abandoned claims are burned, never reassigned. In-flight requests can complete when capture begins; no new upload work is scheduled while busy. Existing jobs retain their original event/device transport even when the next event changes.

Delete first revokes future online access, then purges managed server files. Offline booth cleanup remains pending until reconnection and acknowledgement. Previously delivered/downloaded/buffered bytes and independent backups cannot be recalled. Admin logout clears its in-page key and player, but existing media grants may remain for up to 15 minutes unless the clip is deleted. The server checks current deletion status on each new media request. There is no account/MFA system, remote projector stream, native crash-recoverable recorder or physical printer integration.

## Printer reference and preservation

The user handoff text was read. Two visible Library copies of the H5.3 handoff archive could not provide authorized raw bytes, so no source-based native SPP integration or hardware success is claimed. Existing simulated print policy and conservative real-capture QR fallback remain. Web Bluetooth was not substituted for SPP.

The original v0.6 ZIP and standalone were not modified. v0.7 retains the v0.5/v0.6 IndexedDB name/schema and Android application ID; new auxiliary configuration is additive. Source provenance, interface map, change patch and rollback instructions are included. Export important recordings and close old tabs before upgrade. Rollback cannot undo cloud deletion or safely resume v0.7 cloud jobs in v0.6.

## Packaging

The delivery gate verifies ZIP CRC, every source-manifest SHA-256, excluded deployment secrets/data, and a clean extracted rebuild of standalone HTML and all three web/cloud ZIP formats. Final archive hashes and equality results are in the separately delivered Package_Verification.json. Build checks do not imply a successful Android native job or live deployment.
