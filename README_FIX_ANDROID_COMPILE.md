# RetroBooth v0.9.2 Android compile fix — uploaded GitHub log

## Exact failure
`MainActivity.java:118`: `WebViewClientCompat` declares `onReceivedError(WebView, WebResourceRequest, android.webkit.WebResourceError)` final. The v0.9.2 callback cannot override it.

## Fix
Use `androidx.webkit.WebResourceErrorCompat` in the import and callback signature. The main-frame error code diagnostic remains unchanged. No capture, permissions, cloud, printing, or Windows logic is changed. Android versionCode stays **11** to preserve the original v0.9.2 test contract; upgrades require the same signing identity.

## Apply
1. Back up or commit the existing repository.
2. Unzip the PATCH and copy the `android/` and `tools/` folders into the repository root (merge folders).
3. Run `python tools/check-android-webview-callback.py`, then `npm run desktop:prepare && npm test`, and `python tools/verify-repository.py`.
4. Commit and push to `main`. Launch a **NEW** Actions -> **RetroBooth - Build Android APK** run. Do not re-run the old SHA.
5. Download the TEST APK only after Android compile and lint succeed. Export important recordings before attempting an update. Do not uninstall to fix a signing mismatch.

## Limits
This repairs the Java compile error identified by the supplied log. Source guard, repository preflight and Node tests pass locally; full Android SDK compilation and physical camera testing were NOT performed here. Additional compiler/runtime faults may appear. The original `Device is busy or unavailable` camera issue is NOT proven fixed; after installation use Admin Device Check tests and Export full diagnostic JSON.
