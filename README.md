# RetroBooth v0.8 / Android Bluetooth QR pilot

Luce Studio local-first video guestbook for a provisional 32-inch landscape Android screen. One Start action, fixed recording, local save, QR hand-off, return to Start. Both CRT styles and their camera grades remain.

**New:** independent Android secure-SPP QR-ticket source, dedicated paired-device pinning, private hash-only ticket journal, duplicate suppression, intentional same-link reprints and bounded timed-QR fallback. This is NOT a port of the inaccessible LensDrop H5.3 driver. The existing v0.7 private PHP cloud is retained.

**No Android APK was compiled and no Bluetooth/paper hardware was tested in this delivery.** Web distributions are built; Android requires the GitHub native compile/lint job and actual device acceptance. Chrome/Hostinger cannot use this SPP module. The native profile prints QR + ASCII/numeric label only: **no snapshot, logo, Chinese text, designer layout, cutter, BLE or USB**.

## Desktop webcam preview
```sh
npm run build
npm test
npm start
```
Node 22+, no npm runtime dependencies. Open `http://127.0.0.1:4173/?setup=1`, allow camera + mic. Browser preview shows the printer panel as unavailable; it must not imply a physical connection.

## Android printing pilot
Build the Android TEST APK from `.github/workflows/build-all.yml`, install with the same signing identity, configure cloud, pair a compatible SPP/ESC-POS printer in Android Settings, then open Admin > 08 / ANDROID BLUETOOTH QR TICKETS. Grant Nearby devices permission, explicitly pin its address, connect and test paper. Follow guide sections 12-16 before enabling auto send.

Every completed transport write is `sent_unconfirmed`, NOT paper-confirmed. Screen QR stays on by default. Advanced fast return requires the operator to paste the exact observed guest QR and accept the risk in a native dialog; it is connection-bound, expires within four hours and can still hide QR when paper is missing. Do not enable unattended.

## Test / package
```sh
npm run test:native-core    # JDK 17+, actual temporary filesystem; fake transport
python tests/cloud_api.py # PHP 8.2+, FFmpeg; actual loopback HTTP/private files
python -m pip install -r requirements-test.txt
python -m playwright install chromium
python tests/run_suite.py # explicit synthetic/mocked browser tests
python tests/real_origin.py --require-origin
python tests/cloud_real_origin.py
npm run package:web
python tools/package_source.py
```
Tests and non-results are distinguished in [Test report](docs/TEST_REPORT.md). The CI workflow leaves required real-origin checks ON. Native compile/lint remains a separate gate; a Java unit test is not APK validation.

## Distributions
The manual **RetroBooth - Build all test versions** workflow creates Web/Cloud ZIPs and, only after a successful native job, TEST APK plus UNSIGNED APK/AAB. No historical-version, EXE, DMG or IPA build is included. It does not deploy Hostinger or publish an app store release. Both TV styles are in one app.

The retained PHP API reports build `0.7.0-alpha.1` and `printer:not_connected` because the server never owns the local Bluetooth device. Booth/app version is `0.8.0-alpha.1`; this is deliberate backend compatibility, not a missing server update.

## Guides
- [Setup & running guide](docs/SETUP_AND_RUNNING_GUIDE.md)
- [Editable Word guide](docs/RetroBooth_v0.8_Setup_and_Running_Guide.docx)
- [Quick start](docs/QUICK_START.md)
- [Native ticket contract](docs/PRINT_ADAPTER_CONTRACT.md)
- [Architecture and security boundaries](docs/ARCHITECTURE.md)
- [Actual adapter map](docs/ADAPTER_MAP.md)
- [Migration / rollback](docs/MIGRATION_AND_ROLLBACK.md)
- [Signing](docs/ANDROID_SIGNING.md)
- [Reference access / provenance](docs/REFERENCE_REVIEW.md)

## Boundaries
The local Admin entry gesture is NOT authentication. Keep the device supervised. Cloud owner QR links allow deletion: protect the paper and use view-only links for sharing. Browser media storage is not native crash-safe recording or a backup. Remote projector synchronization is not implemented. Never commit `config.php`, device bundles, guest recordings, private URLs or signing material. Never clear app storage/uninstall to solve a printing problem before exporting and verifying recordings.
