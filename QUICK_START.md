# RetroBooth v0.9 - Web and cloud quick start

This is the web/cloud distribution. It is NOT an APK or Windows EXE. Build those using the complete Android/Windows GitHub source package and `.github/workflows/build-android.yml` or `.github/workflows/build-windows.yml`.

## Local webcam package

Install Node.js 22+ on the development computer. Run the included Windows BAT or use `bash Start_Webcam_macOS.command` / `sh Start_Webcam_Linux.sh`. Keep the server terminal open and open `http://127.0.0.1:4173/?setup=1` on the SAME computer. Allow webcam and microphone, record, then verify playback/export. Remote devices need HTTPS, not their own 127.0.0.1.

## Static preview

Put the static files at a dedicated HTTPS preview origin. It contains no PHP backend. Camera permissions, storage and actual device compatibility still need testing. Cloud is off initially.

## Private cloud package

Copy only the contents of `public_html` into the website document root. Place `retrobooth_private` as its sibling OUTSIDE EVERY public webroot. Never upload the entire repository into public_html. Never commit or expose config.php, runtime media/data or device secrets.

The full private server setup is preserved at `history/v0.8/SETUP_AND_RUNNING_GUIDE.md`, sections02-07, because the PHP API has not changed. The current guide identifies v0.9 APK/EXE names; old names in the historical guide are not the current build names.

For NEW servers, use the included private config generator with your own root HTTPS origin. For EXISTING servers, preserve the private configuration and all secrets/data. Add `retrobooth://app` to corsOrigins to allow the new Windows app, retaining any other required trusted origins. Do not regenerate keys as an upgrade step. Create a distinct device identity for each booth.

## Scope

Browser pages cannot activate the Android SPP bridge. Android APK retains the QR-only secure-SPP pilot; Windows EXE does not implement a printer transport. This build is not event-certified. Fullscreen is not an OS kiosk lock. Unfinished recordings can be lost on crash; export verified local clips before upgrades or clearing data.
