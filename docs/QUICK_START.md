# RetroBooth v0.8 / Start here

## Web preview: camera + cloud, NOT Bluetooth
Local Webcam ZIP: install Node 22+, then run Start_Webcam_Windows.bat, or `bash Start_Webcam_macOS.command`, or `sh Start_Webcam_Linux.sh`. Open `http://127.0.0.1:4173/?setup=1` on that computer. Enable camera + mic. The scripts are launchers, not native installers.

Static Preview ZIP: deploy its contents to a separate HTTPS preview site. It contains no PHP backend. Neither Chrome nor a Hostinger page can operate this native SPP module.

Cloud Alpha ZIP: only `public_html/` contents belong in the public document root. Put `retrobooth_private/` outside EVERY public web root. Read SETUP_AND_RUNNING_GUIDE.md before generating your own secrets. Never upload the entire repository or private folder under a public root. The retained server is v0.7; its `printer:not_connected` health field is correct because Bluetooth belongs to Android, not Hostinger.

## Android QR printing
Use the GitHub Ready source and manual `RetroBooth - Build all test versions` workflow. After the native job succeeds, download the **RetroBooth-Android-v0.8-RUN** artifact and install **RetroBooth-v0.8-Android-TEST.apk**. No APK was compiled during this source delivery. Do not install an unsigned APK/AAB as the test app. Preserve signing identity and export videos before any uninstall.

Admin: tap the bottom-right v0.8 label five times or hold CH 03 for five seconds. This gesture is not a password. Configure cloud (07), then printer (08). Pair the printer in Android Settings, grant Nearby devices permission, choose and pin the exact paired address, then Connect secure SPP. Print the diagnostic QR, then a selected real cloud clip. Verify the complete scanned guest URL and the correct phone page.

The native ticket is **QR-only + ASCII label/message number**. Snapshot, Chinese/logo/receipt-designer layout and automatic cutting are not sent. Supports the tested-in-source ESC/POS QR command profile, not every printer with a Bluetooth name. Exact firmware/paper compatibility remains a hardware gate.

## Automatic flow
After paper tests, enable native Automatic QR tickets for this connection AND enable the receipt-print route in section 06. Start with Print + always show screen QR. Start > record > local save > bounded ticket attempt > timed QR > Start. No successful local save means no new ticket request.

`sent_unconfirmed` means writes returned, not paper success. Unknown outcomes are never auto-retried. Print selected once deduplicates by original message ID; explicit Reprint SAME link creates another acknowledged copy.

Fast return is OFF by default. Advanced acceptance requires an exact manually observed real guest QR from this connection and a native risk dialog. It can hide QR despite paper-out/unreadable output. It expires on pause/disconnect/failure or after four hours. Use only attended after actual acceptance tests.

## Release limits
Web + source ready for pilot review. No Android compile/install, physical webcam/printer test, deployment, GitHub Actions execution, native crash-proof media store or remote projector validation is claimed. See TEST_REPORT.md and the full guide. Keep a verified external backup.
