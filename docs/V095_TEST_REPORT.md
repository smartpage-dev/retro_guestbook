# RetroBooth v0.9.5 test scope

- `npm run desktop:prepare && npm test`: source contracts, standalone HTML, native transport client mock, all 46 desktop tests.
- `npm run test:native-core`: real local Java 17 JVM, fake SPP transport, on-disk ticket journal, verify QR+384x336 raster ESC/POS bytes, duplicate safety. Does NOT validate actual printer.
- `tests/browser_v095_ticket_photo.py`: Chromium synthetic camera/mic, simulated native response; validates photo+QR test request, 1-bit image size/black pixels, default T-2 countdown image persisted in a 10s real MediaRecorder run, settings T-1/T-3 and no unexpected JS errors.
- Android native APK not compiled in authoring environment; GitHub Actions must build and test.
- Real 32-inch Android kiosk, printer Bluetooth SPP, paper image/QR scan, firmware, printer heat and auto-cutter are not verified by these synthetic tests.
- Printer result sent_unconfirmed is not paperConfirmed. Never auto-retry unknown results.

- v0.9.4 full multi-viewport style regression was attempted but did not finish under the authoring session timeout. Existing CRT shell styling code was not changed in this release; no claim of a full rerun.
