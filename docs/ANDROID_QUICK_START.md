**Before GitHub build:** see [ONE_TIME_GITHUB_SOURCE_SYNC_ZH.md](ONE_TIME_GITHUB_SOURCE_SYNC_ZH.md); run the automatic Fast Source Preflight after committing the canonical full release.

**Latest v0.9.9 Android versionCode 18.** The printer pilot supports 384-dot QR + live/countdown still raster, with Admin 04 direct test printing and 4:3 / 16:9 screenshot choices. See [RECEIPT_PRINT_V096_ZH.md](RECEIPT_PRINT_V096_ZH.md) and [QR_PHOTO_TICKET_V095_ZH.md](QR_PHOTO_TICKET_V095_ZH.md). This is not BLE/USB, paper-status or cutter support. Android APK compilation and real paper testing are required.

**v0.9.3 onward: Independent media input fix.** Admin > 02 / Device Check > 1 / APPLY CAMERA - LIVE preview. The preview needs no microphone. Then use 2 / APPLY MICROPHONE; until both are ready, guest Start is disabled. See [ANDROID_MEDIA_V093.md](ANDROID_MEDIA_V093.md).

# 03 / Android APK

Same application ID, versionCode 18

1. Download and extract the Android-APK artifact after a successful Android job. Use the TEST.apk, not the unsigned APK or AAB.
2. Before updating an existing installation, export important recordings and retain the same signing identity. Do not uninstall or clear data to get around an update error.
3. Transfer the APK to the intended Android device. Review its origin and signature; permit installation from that source as needed for this test app.
4. Open RetroBooth, allow camera and microphone and, for printing, Nearby devices. Check real USB webcam/audio recognition on that device.
5. Enter Admin by tapping the version label five times or holding CH 03 for five seconds. Open Camera Lab, enable camera + microphone and select the intended inputs.
6. Record one 10-second clip in each CRT style. Check local playback, sound, export and automatic QR return before connecting cloud or printing.

Source minimum is Android 8/API 26; the intended screen is Android 12, still requiring hardware validation. Modern WebView features, actual camera routing and storage can vary. One APK contains no architecture-specific native media libraries, but that does not guarantee every device works.

## Bluetooth QR pilot remains Android-only

Pair the printer in Android settings, then pin its exact address in Admin section 08. Use secure Classic SPP and a compatible native ESC/POS QR profile. Test a diagnostic ticket, then a real selected private QR. No BLE/USB support; the 384-dot GS v 0 photo extension is a hardware-unverified test path.

Default send result is sent_unconfirmed, not paper-confirmed; keep timed screen QR enabled initially. Unknown jobs never auto-replay. The detailed connection, reprint and fast-return checklist is preserved in history/v0.8/SETUP_AND_RUNNING_GUIDE.md, sections 12-16.

# 06 / Signing and upgrades

Keep identities stable before recording anything important

## Android: four optional repository secrets

The first disposable test can build without secrets; GitHub then uses a temporary debug key. A later run may use a different key and fail to update the installed app. For repeatable upgrades, create a private persistent TEST keystore and configure all four secrets under repository Settings > Secrets and variables > Actions.

```text
RETRO_TEST_KEYSTORE_BASE64
RETRO_TEST_STORE_PASSWORD
RETRO_TEST_KEY_ALIAS
RETRO_TEST_KEY_PASSWORD
```

Use docs/ANDROID_SIGNING.md for keytool and Base64 commands. Keep the keystore, passwords and a separate secure backup outside the repository. All four values must be present together. Reuse the existing key when upgrading v0.8; a new key is not an update workaround.

## Windows: unsigned by default

This workflow does not possess a publisher certificate and does not promise SmartScreen reputation. It produces unsigned test executables with checksums. Same-account installed and portable builds use the stable Luce RetroBooth profile. Export clips before upgrading, changing accounts, deleting app data or moving to another PC.

## Dependency lock for repeat builds

Electron 45.4.1 and electron-builder 26.18.0 are pinned directly. No fabricated npm lockfile is supplied: the authoring environment could not reach the registry. The first Windows job resolves dependencies and uploads desktop/package-lock.json in its Evidence artifact. Review and commit that file at desktop/package-lock.json. Subsequent builds use npm ci; before that, transitive resolution is not fully frozen.

Do not commit a signing keystore, .pfx certificate, generated private cloud setup or guest media. Workflow artifacts do not contain live deployment credentials.
