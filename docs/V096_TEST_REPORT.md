# RetroBooth 0.9.6-alpha.1 — Test & Delivery Report

## Implemented

- Admin 04 receipt-test buttons route to the **same native Bluetooth Classic secure SPP / ESC/POS `test` operation** as Admin 08; no fake browser printing. All sends still require a pinned, connected printer and explicit native confirmation. Test QR is a non-working example.invalid destination.
- Receipt photo selector persists `ticketPhotoAspect` on event and new clip settings, **4:3 default** (384x288 monochrome) or **16:9** (384x216). Capture moment T−2 remains default.
- Both formats produce exact bounded 1bpp raster and GS v 0 native packets; QR remains native Model 2. Old recordings (no ratio setting) still encode legacy 384x336 8:7 for manual reprints. Old ticket hashes/journal semantics are preserved.
- Current unsaved title/caption/footer/style and ratio are applied to **diagnostic ticket**; live camera when available, otherwise SAMPLE marker. Receipt Mode QR-only sends QR with no photo.
- Full browser preview reflects true photo height. Native ticket paper fonts/spacing/logo do NOT exactly match browser artwork. Chinese/logo printing not implemented.

## Passed locally

- `npm test` after desktop preparation: all included Node/core/client/static and **46/46 desktop** tests passed.
- `python tools/test_native_core.py`: **85/85 Java print core tests**, including old fingerprint/QR idempotency, 4:3/16:9 GS v0 sizes, header/footer ASCII and invalid packet rejection. Java core used fake output stream; not an Android native compilation.
- `CHROMIUM_PATH=/usr/bin/chromium python tests/browser_v096_receipt_printer.py`: **19/19** checks passed (04, preview, unsaved design, 4:3/16:9, no-camera SAMPLE, mocked Bluetooth response, live synthetic camera, QR-only, 770x360 UI).
- `... python tests/browser_v094_style_fit.py`: **170/170** checks passed for 01/02 CRT geometry, including Version 5 taps and seven landscape sizes.
- `... python tests/browser_v093_separated.py`: **34/34** checks passed for separate camera/microphone synthetic acquisition and recording; slight meter sampling wait added to avoid a timing-only flake.
- `... python tests/browser_v095_ticket_photo.py`: **11/11** passed in an earlier local run after adapting to 384x288 default. A subsequent combined final re-run exceeded the batch timeout after 8 checks, so no fresh complete second pass is claimed.
- `python tools/verify-repository.py`: three independent GitHub workflows and mandatory source contract passed.
- `node tools/build.mjs` and `node tools/prepare-desktop.mjs`: web/Android embedded HTML regenerated and desktop CSP hashes refreshed.

## Not tested / no guarantees

- No actual signed Android APK built in the authoring environment, Android Studio/SDK native lint not executed here. Must build through GitHub Actions before installing.
- **No physical Bluetooth printer connected**: paper, QR scanning, contrast, cut, actual device support/firmware and no-paper behavior remain unverified.
- Windows Electron EXE, Hostinger deployment, full browser group suite and real Android 32-inch soak not revalidated for this release. No change to Windows printer support.
- Output status `sent_unconfirmed` is NOT paper confirmation; never automatically retry an uncertain send. Do not disable on-screen QR until hardware acceptance.

## Reference artifacts

- `qa/v096-receipt-designer-43.png` / `...-169.png`: actual Chromium screenshots with mocked native printer, not physical paper.
- `qa/v096-receipt-printer-browser.json`: scoped checks and scope statement.
- `docs/RECEIPT_PRINT_V096_ZH.md`: Chinese operator instructions and limitations.
