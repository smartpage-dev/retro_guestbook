# v0.9 migration and rollback

## Existing Android / web / cloud

No media migration is performed. IndexedDB name/schema and Android application ID are unchanged, and Android versionCode is 9. Android Java printing/ledger implementation is retained. Export recordings and close old tabs/apps before upgrade. Keep the same Android signing key; never uninstall as the first response to a signature mismatch.

The PHP service and guest/Admin code remain unchanged. The config EXAMPLE and configuration generator add the Windows origin. For an existing deployment, back up `config.php`, add `retrobooth://app` to `corsOrigins`, preserve every secret/path and required origin, and test. Do not replace existing config with an example or regenerate keys. No upload/deployment takes place automatically.

## Windows is a new local application

Origin: `retrobooth://app`. Per-account profile: `%APPDATA%/Luce RetroBooth`, with Chromium storage beneath it. No browser/Android import is implemented. Start with a new device credential. The portable and installed edition use the same profile and single-instance lock in that Windows account. Copying EXE to another PC does not copy media/configuration.

Keep tested build outputs and export/playback-verify all important clips. Close the app before any verified full-profile backup; no profile restore/merge utility is certified. File exports are independent playable copies, not a restore archive. Avoid synchronizing the live Chromium database with cloud-folder clients.

## Rollback

Retain v0.8 source unmodified. Reverting source cannot reverse cloud Delete or recreate media. Drain uploads and deletion acknowledgements before reverting. Android may require an intentionally increased versionCode with the same signing key for a rollback APK; do not lower schema or wipe data. Windows profile is separate from v0.8 browser storage; an older web/Android program cannot load it automatically.

Disabling Windows cloud access or removing the desktop CORS origin may strand its queued uploads. Retire devices deliberately, and keep the original credentials until uploads/cleanup complete.
