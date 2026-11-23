# RetroBooth v0.6 - repository, build, setup and running guide

Version 0.6.0-prototype.1 | 21 November 2026 | Luce Studio

## 1. Choose the right package

For the fastest real webcam test, use **Local Webcam Test** on a Windows/Mac computer. It runs a local website and requires Node.js 22 or newer. It is not a native desktop recorder.

For the 32-inch landscape Android display, use the **Hostinger Static Preview** over HTTPS in Chrome first. Android 12 is provisional; the exact display, browser, USB webcam and microphone have not been verified.

The **standalone HTML** is useful for reviewing the interface. Camera and durable-storage testing should use the local server or HTTPS, not a messaging-app document preview.

The **GitHub Ready** ZIP contains the editable source, build scripts, tests, workflow, Android test shell and this guide. There is no precompiled APK in this delivery. A successful GitHub Android job creates the TEST APK. Unsigned APK/AAB are build outputs for later signing, not installable guest-facing releases.

Both television styles are included in ONE app. "Build all test versions" means the current supported distribution formats, not rebuilding old releases or producing native Windows/macOS/iOS apps.

**Important:** real printing and cloud delivery are not connected. The QR explicitly says NO ONLINE VIDEO. Do not use this prototype as the sole recorder at an event.

## 2. Test a webcam on Windows or Mac

1. Install Node.js 22 or newer from the official Node.js website. Reopen your terminal after installation. Type `node --version`; the major version must be at least 22.
2. Extract the Local Webcam Test ZIP. Do not run files while still inside a ZIP viewer.
3. Windows: open `Start_Webcam_Windows.bat`. Mac: open Terminal in the extracted folder and run `bash Start_Webcam_macOS.command`. Linux: `sh Start_Webcam_Linux.sh`.
4. The launcher opens `http://127.0.0.1:4173/?setup=1`. Keep its terminal window open. Closing it stops the server.
5. The setup address opens Admin. In Camera Lab, click **Enable webcam + microphone**. Allow both browser permission prompts. A webcam without a usable microphone is intentionally rejected.
6. In **Device Check**, select the intended camera and microphone; click **Apply + enable**. The device list becomes more useful after permission is granted. A camera already opened by another app may be unavailable; close that app and retry.
7. Speak and watch the microphone meter. Seeing movement proves input activity, not speech quality or synchronization. Listen to a recorded test before accepting the setup.
8. Keep **Camera look > Follow screen style**. Use **Save look + return to booth**. Select the television design in Admin separately when needed.
9. Press START once. After the fixed recording time, the clip is saved, then a test QR appears for 10 seconds by default. The screen returns directly to START without another thank-you delay. Do not close the browser during saving.
10. Enter Admin again, open **Tape library > Play / export**, play the saved clip and download it. Switch the TV style, then make a second test clip.

Admin entry: tap `v0.6 / PREVIEW` at the bottom of the right panel five times, or hold CH 03 for five seconds. This is an entrance gesture, not password authentication.

v0.6 retains the v0.5 database and application ID. Existing clips are not rewritten or migrated. Close old booth tabs before upgrading; export wanted videos first.

Local recordings belong to this browser profile and origin. `localhost`, `127.0.0.1`, different ports, browsers and Android apps do not share one recording library. Keep the same address when retesting. Export before changing the environment.

## 3. Test Android through Hostinger HTTPS

1. In the correct Hostinger website's File Manager, create a NEW directory such as `public_html/retrobooth-v06`. Do not overwrite another booth or a live event installation.
2. Upload and extract the Hostinger Static Preview ZIP there. `index.html` must be directly inside that directory, not hidden in an extra nested folder. Keep `sw.js` and `.htaccess` alongside it; `.htaccess` may be hidden by the file manager.
3. Open the resulting HTTPS address, for example `https://YOUR-DOMAIN/retrobooth-v06/`. Replace YOUR-DOMAIN with your own domain. This guide has not created or deployed that address.
4. On Android Chrome, allow camera and microphone access. Enter Admin and enable the camera explicitly; it does not turn on automatically when the page opens.
5. Choose the USB camera and microphone in Device Check if they are exposed by Android. A missing camera in that list is not something the filter can repair. Check USB power, another port/hub, Android settings and the hardware's camera support.
6. Use Full screen + return to booth for a full-screen trial. Browser full screen is not OS kiosk lockdown.
7. Record, replay from the staff library and export two clips, one per style. Check faces, framing, noise level, scanlines, speech and lip synchronization.

Use HTTPS for the remotely hosted page. An ordinary LAN address such as `http://192.168.1.10:4173` is not the same as trusted local loopback. This package deliberately does not expose the local server to the LAN or disable browser security.

The static site does not upload videos. Recordings remain on the Android browser, not in Hostinger File Manager. The offline service worker caches the app shell only, not a cloud copy or a backup. Opening the site once is not proof of offline readiness; test a reload with the network disabled after exporting your test clips.

## 4. Use Camera Lab and the two looks

**Follow screen style** is the default. Edge-to-edge CRT selects **Colour Film CRT**: restrained colour, warm film-like grading, lifted dark tones, quiet moving snow and scanlines. Heritage selects **Heritage Soft Mono**: subdued yellow-grey/near-monochrome colour and slightly stronger scanlines. It is not hard four-colour posterization. **Always neutral black & white** removes the tint and locks saturation/warmth at zero.

Each look keeps separate values for moving snow, scanlines, saturation, warmth and softness. Sliders preview a draft in Camera Lab. **Save camera look** stores only the look settings. **Save look + return to booth** stores them and returns to START. **Discard look draft + return** throws away the draft. Event/receipt fields have their own save button; save them before leaving Admin.

**Compare unprocessed camera** changes only the small Admin comparison panel. It does not switch the recorder to raw video. The saved video always receives the saved look. The live render-rate readout is not the camera frame rate, encoded frame rate or an Android performance guarantee.

The recording canvas contains the processed picture and, when enabled, the date/time OSD. It does NOT contain the TV cabinet, START button, REC overlay, countdown or waveform. Mirror preview affects the booth preview only; the saved video is not mirrored. The clean snapshot for the receipt is processed separately into black-and-white dots; the QR is not passed through snow or scanlines.

There is no guest replay/approval step. Time is fixed in Admin: 10, 30 or 60 seconds. After capture the system saves, prepares a receipt preview, shows the timed QR and returns automatically. An actual printer is not connected. A local save failure stops the loop for staff intervention.

## 5. Configure timed QR and automatic return

Open Admin, then **06 / QR & AUTO RETURN**. These controls are separate from Camera Lab and the receipt designer. They do not change recording duration, effects or privacy settings.

**QR display:** choose 5-60 seconds; the default is 10. The countdown begins when the QR is displayed, not when recording ends. Expiry clears the previous QR and returns directly to START. There is no extra thank-you delay after this screen and no guest confirmation button. Hidden time is not added back when the page returns.

**Completion mode:** Smart shows QR unless an eligible QR-ticket result permits bypass. Screen only never waits for a print result. Print + always show QR retains the same timed screen even after the simulated confirmed result.

**Enable receipt print route:** off by default. This is a policy/preview switch, NOT a physical printer connection. **Maximum print-result wait:** 1-15 seconds, default 4. An expired wait falls back to QR; it never resends a ticket automatically.

In Event & Capture, **Return after thanks** controls only the bypass branch: 0, 1, 2, 3 or 5 seconds. Zero returns directly to START. The QR branch ignores this separate delay. Save Event & Capture changes with its own Save button.

### Preview the fast printed-ticket branch

1. Keep Camera Lab in DEMO / CAMERA OFF. In QR & AUTO RETURN, choose Smart, enable the print route and save.
2. In the clearly labeled demo-only scenario selector, choose **Confirmed QR print (SIMULATED, no paper)**. This selection is not saved and resets after reload.
3. Return to the booth and press START. A demo message completes, bypasses the QR screen and returns after the selected thank-you delay. No video or paper is produced.
4. Repeat with Connected only, Sent / unconfirmed, Unknown or Timeout. Each must fall back to the timed QR. A photo-only receipt also keeps QR on screen.
5. Enable the real webcam and repeat. Real capture ignores the confirmed-print simulation and shows QR because no trusted physical printer adapter is connected.

**This build never claims physical completion.** The screen and receipt encode the same local test marker, NOT an online viewing URL. A future real adapter must save an immutable ticket first, keep the exact guest/session identity, and distinguish sent_unconfirmed from paper completion. Connection alone must not bypass QR. See ADAPTER_MAP.md and PRINT_ADAPTER_CONTRACT.md.

## 6. Put the project into GitHub

The simplest route is GitHub Desktop. This package has not created a repository in your account.

1. Install GitHub Desktop and sign in to your own account.
2. Choose **File > New repository**. Give it a name such as `retrobooth`. Choose a local folder you can find. Create the repository.
3. Extract the GitHub Ready ZIP. Open the extracted `RetroBooth` folder. Copy its CONTENTS into the new repository folder. Do not copy only the outer folder or the ZIP itself.
4. Include hidden files and folders, especially `.github`, `.gitignore` and `.gitattributes`. Mac Finder: Command+Shift+period shows hidden files. Windows Explorer: enable Hidden items.
5. At the repository root, confirm you see `package.json`, `src`, `tools`, `tests`, `android`, `docs`, and `.github/workflows/build-all.yml`.
6. Back in GitHub Desktop, review Changes. Do not include real recordings, tokens, passwords or signing keys. The supplied ignore file excludes common generated/private locations, but it cannot recognize every sensitive file you create.
7. In Summary, enter `Import RetroBooth v0.6`. Click Commit to your branch, then **Publish repository**. Keep the repository private for development.
8. Open the repository on GitHub. Confirm that the workflow is on the repository's default branch. The default branch is often main, but check your actual repository.

For an existing repository, make a separate branch and review differences before replacing files. Do not overwrite another project's root. Push a normal commit after each tested change; publishing the same ZIP as a release attachment does not make it editable source.

## 7. Run the GitHub build and download PROGRAMS

1. Open your repository's **Actions** tab.
2. Select **RetroBooth - Build all test versions**.
3. Click **Run workflow** and choose the branch. Keep **build_android** enabled for Android outputs. **origin_tests** requires a real localhost/IndexedDB test with Chromium fake devices on the runner; it is enabled by default.
4. Click Run workflow. The Web job builds and tests the app. The Android job starts only after Web succeeds. No website deployment, public release or app-store upload occurs.
5. Open the run. Check the job results rather than assuming a started job has succeeded. For a failure, open the first failed step and download diagnostic evidence. Do not treat an incomplete run as a successful build.
6. In the run's Artifacts section, download **RetroBooth-Web-v0.6-RUN** for the HTML/static/local-webcam packages and **RetroBooth-Android-v0.6-RUN** for Android programs. RUN is the workflow run number.
7. **RetroBooth-Test-Evidence-RUN** and **RetroBooth-Android-Evidence-RUN** contain reports/screenshots, not installable programs. The Artifacts package may be an outer ZIP containing the individual distribution ZIPs/APKs.
8. Save the BUILD_INFO and SHA256SUMS files with the programs. The workflow requests 14-day artifact retention; download anything you need before expiry or removal.

If Run workflow is absent, check the default-branch workflow path and whether Actions is allowed by repository/organization policy. Do not upload the project ZIP as a substitute for the actual `.github/workflows/build-all.yml` file.

The release Android outputs are explicitly UNSIGNED. The TEST APK is signed for testing, not certified for production. A green build means the listed code/build checks succeeded, not that the target display, webcam or thermal printer passed acceptance.

## 8. Install and test the Android shell

Only do this after the GitHub Android job succeeds. This delivery includes source and workflow, not a locally compiled APK.

1. Download **RetroBooth-v0.6-Android-TEST.apk** from the Android program artifact. Do not choose the unsigned APK or AAB.
2. Copy the TEST APK to the Android screen. Use Android's normal, per-source permission to install your own APK; follow any organization/device restrictions. Do not disable general device protections.
3. Open **RetroBooth TEST**. It bundles the web assets locally and requests camera/microphone access when you enable them in Admin.
4. Allow both Android app permissions and the in-app camera request. Select exposed devices and inspect the microphone meter.
5. Record one clip per style. Reopen the app and check the library. Export using Play / export: the Android document picker asks where to save the file. Wait for Export complete, then open the exported file independently.
6. Do not uninstall or Clear storage until all wanted clips are exported and verified. Uninstalling removes the app's IndexedDB data.

This is a lightweight Android WebView wrapper, not the earlier planned completed Capacitor/native system. It uses local HTTPS-style app assets, origin-restricted web permissions, a chunked document export bridge and landscape presentation. It still relies on WebView MediaRecorder and browser storage. It has no native crash-recovery recording, SPP/BLE printer driver, background uploader or managed kiosk lock.

Webcam support and codec support depend on the actual Android/WebView/device combination. Update Chrome/Android System WebView through the device's supported update route and test. An emulator or GitHub build cannot prove USB webcam support on the screen.

## 9. Signing, upgrades and local developer commands

### Do not accidentally lose recordings during APK updates

Without signing secrets, GitHub creates an **ephemeral debug key** on its runner. A later run may use a different key. Android may reject an in-place update. Do not solve that by uninstalling before exporting videos.

For repeat tests, keep a persistent TEST keystore privately and add the four repository secrets described in `ANDROID_SIGNING.md`: RETRO_TEST_KEYSTORE_BASE64, RETRO_TEST_STORE_PASSWORD, RETRO_TEST_KEY_ALIAS, RETRO_TEST_KEY_PASSWORD. Never commit the keystore or paste passwords into workflow YAML. The workflow only uses this key for the TEST build; release outputs stay unsigned. This is not production signing.

### Work on the web app locally

```sh
node --version
npm run build
npm test
npm start
```

No npm install is required for the app or static tests. For browser tests, install Python 3.13 and then:

```sh
python -m pip install -r requirements-test.txt
python -m playwright install chromium
python tests/run_suite.py
python tests/real_origin.py --require-origin
npm run package:web
```

The normal suite uses labelled mock storage/synthetic media for deterministic UI checks. `real_origin.py` adds actual local-origin IndexedDB and Chromium fake-device checks. Neither is a physical webcam or Android acceptance test.

For a local Android build, install JDK 17, Android SDK 35/build-tools 35.0.0 and Gradle 8.11.1, set ANDROID_HOME, then run:

```sh
npm run android:assets
gradle -p android :app:assembleDebug :app:lintDebug
```

This repository uses the Gradle installed by GitHub setup-gradle; it does not bundle a Gradle wrapper JAR. Prefer the supplied GitHub workflow for the first native build. The native project pins AGP 8.9.1, SDK 35 and AndroidX WebKit 1.12.1; it is not a claim to use the latest Android toolchain or meet current app-store submission requirements.

## 10. Troubleshooting and acceptance checklist

**Camera permission denied:** allow BOTH camera and microphone for the site/app. Check Android/OS app permissions as well as browser site permissions. Retry from Camera Lab.

**Device busy / no camera:** close other camera apps, check cable and USB power, refresh devices, choose System default first. An unlisted Android webcam may not be exposed by the platform.

**Camera visible, START reports storage unavailable:** use a normal browser profile on the local server or HTTPS, not a file preview or restrictive private browsing environment. Export existing data before changing profiles. The app deliberately blocks unsaved real capture.

**Page shows the wrong build:** check the v0.6 label and BUILD_INFO. Close old tabs and reload online. Use a separate v0.6 preview directory for files. On the same origin, v0.5 and v0.6 intentionally share their database; do not run them together. Do not clear app/browser data to fix caching until videos are exported.

**Video looks different from the Admin comparison:** the raw checkbox is comparison-only. Check the saved Camera look, not an unsaved draft. The booth preview may be mirrored while the saved video is not.

**QR appears despite enabling the print route:** expected with a real webcam. Only the explicitly selected DEMO confirmed-result scenario can bypass in this release. No physical driver is connected.

**QR returns too slowly:** adjust QR display, not Return after thanks. Smart mode may also wait up to the configured print-result deadline in a simulated timeout. Screen only skips that wait.

**No paper or phone playback link:** expected in this prototype. The receipt is an image preview and the QR is not an online video URL.

**GitHub fails in Android, Web succeeds:** keep the Web program artifact and inspect the first Android error plus its evidence. Do not relabel source as a compiled APK.

**Install/update rejected:** verify that the file is the TEST APK, Android is compatible and the signing identity matches. Export existing clips before any uninstall. Never rename an AAB or unsigned APK to make it look installable.

Before progressing beyond testing, verify actual device model/Android/WebView versions; both camera looks and 10/30/60-second captures; audio/video synchronization; repeated automatic cycles; actual exported-file playback; reload and restart persistence; camera disconnect/reconnect; low storage and interrupted-save handling; and long-duration temperature/performance. Cloud, printing, authenticated access, native recovery and remote-show revocation need separate implementation and acceptance.

## Sources for platform/setup instructions

Project behavior and filenames above refer to this delivered source. External platform instructions were checked against these primary references; interface labels may change.

1. GitHub Desktop, creating a repository: https://docs.github.com/en/desktop/overview/creating-your-first-repository-using-github-desktop
2. GitHub, manually running a workflow: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
3. GitHub, downloading artifacts: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts
4. MDN, getUserMedia and secure contexts: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
5. Android, in-app WebView content: https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
6. Android, runtime permissions: https://developer.android.com/training/permissions/requesting
7. Android, AGP 8.9 compatibility: https://developer.android.com/build/releases/agp-8-9-0-release-notes
8. Hostinger, File Manager: https://support.hostinger.com/en/articles/4548688-basic-actions-in-the-file-manager
9. Gradle setup action: https://github.com/gradle/actions/blob/main/docs/setup-gradle.md
10. Android, app signing and update identity: https://developer.android.com/studio/publish/app-signing
11. Node.js, official downloads: https://nodejs.org/en/download
