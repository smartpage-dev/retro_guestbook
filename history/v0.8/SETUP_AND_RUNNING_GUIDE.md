# RetroBooth v0.8 - Setup & running guide

## RetroBooth v0.8
Setup & running guide | Android Bluetooth QR pilot

Luce Studio / 0.8.0-alpha.1 / 23 November 2026

One Start action. Fixed recording time. Local save. Timed QR. Return to Start. The two CRT designs and their webcam effects stay in the same application.

### What this release adds

New: an independent Android secure-SPP QR-ticket module, pinned paired printer, hash-only durable ticket journal, deliberate reprints and timed screen-QR fallback. The v0.7 private-cloud service and both webcam looks are retained.

### Choose the correct package

| Package | Purpose |
|---|---|
| Local Webcam Test | Desktop camera/microphone and local recording test. |
| Hostinger Static Preview | Frontend only; no PHP backend inside this ZIP. |
| Hostinger Cloud Alpha | Public website plus separate PRIVATE PHP application. |
| GitHub Ready | Source + manual workflow to build the Android QR pilot. |

### Important release boundaries

The native transport is implemented in source, but no APK/AAB was compiled and no physical print is certified here. QR-only ASCII ticket: no snapshot, logo, Chinese text or cutter yet. Chrome/Hostinger pages cannot use this native SPP module. This is a development pilot, not an event-ready release.

Start with a disposable event and non-sensitive test recordings. Export and verify important local videos before changing versions, origins, browsers or APK signing keys.

## 01 / Desktop webcam test
Keep the existing local workflow working first

1. Install Node.js 22 or newer. Extract Local Webcam Test to an ordinary folder.
2. Windows: open Start_Webcam_Windows.bat. Mac: open Terminal in the folder and run bash Start_Webcam_macOS.command. Linux: run sh Start_Webcam_Linux.sh.
3. Keep the terminal open. In a full browser open http://127.0.0.1:4173/?setup=1.
4. In Camera Lab select Enable webcam + microphone. Allow BOTH permissions. Select the intended devices in Device Check, then Apply + enable.
5. Speak and check the microphone meter. Leave Camera look on Follow screen style. Save and return to the booth.
6. Press Start once. Wait for the configured recording, local save, QR window and automatic return. Open Tape library > Play / export to check and download the saved file.

### Finding Admin

Tap the right-panel v0.8 / PREVIEW label five times, or hold CH 03 for five seconds. This is a hidden entry gesture, NOT a password or security boundary. Keep the booth supervised or use managed device restrictions.

### Useful defaults

| Setting | Default / range |
|---|---|
| Recording | 10 seconds; 10 / 30 / 60 available. |
| QR window | 10 seconds; 5-60 seconds. |
| Camera look | Follow style: Edge colour film / Heritage soft mono. |
| Physical print | OFF. Android APK required; keep screen QR for first tests. |

The local launcher is a Node loopback server, not an EXE/DMG. A phone or Android screen cannot open your computer by using its own 127.0.0.1 address. Use the HTTPS website for those devices.

## 02 / Cloud hosting layout
Use a dedicated HTTPS site; keep private files out of every web root

The cloud service requires PHP 8.2 or newer, working fsync/flock, a writable local filesystem and Apache/LiteSpeed-compatible rewrite rules. Actual Hostinger filesystem locking, permissions and throughput must be verified on your account.

1. Create a dedicated HTTPS website/subdomain with its own document root. Do not overwrite another booth application.
2. Extract Hostinger Cloud Alpha locally. Identify the target website document root in File Manager.
3. Copy only the CONTENTS of the package public_html folder into that document root, including the hidden .htaccess.
4. Place retrobooth_private beside that public_html folder, outside ALL publicly served folders, including any parent website root.
5. Keep tools and guides outside the website. Never upload the entire repository or both package folders into public_html.

```text
site-folder/
  public_html/
    index.php
    .htaccess
    booth/index.html
    guest/index.html
    admin/index.html
    assets/
  retrobooth_private/
    app/Cloud.php
    config.php              <- create privately
    tools/cleanup.php
    data/                   <- created at first use
```

The PHP bootstrap expects this sibling layout. Do not use a subfolder of an existing public_html as though its sibling were private: another website could still serve that folder. If your host cannot provide this arrangement, do not deploy this package unchanged.

This alpha uses locked private JSON metadata and private media files, NOT the MySQL database proposed in the original plan. It targets one host and a small pilot, not multiple application servers or network-mounted storage.

## 03 / Create private configuration
Generate unique secrets locally, never inside GitHub Actions

The cloud ZIP includes tools/generate-cloud-config.mjs. In the extracted package folder run the command below with your own HTTPS origin. Use the root origin, without /booth, a query string or a fragment.

```text
node tools/generate-cloud-config.mjs \
  https://YOUR-RETRO-SUBDOMAIN \
  retrobooth_private/config.php
```

On Windows the same command can be entered on one line. The tool refuses to overwrite an existing config. It generates a unique Admin key and a different cookie-signing key. Save the printed Admin key in your password manager; do not paste it into a chat, repository or screenshot.

1. Upload config.php only into retrobooth_private, never into public_html. The provided config.example.php is NOT usable until placeholders are replaced.
2. Use restrictive permissions appropriate to the PHP account: private files 600 and directories 700 where supported. Do not solve permission errors by making private data world-writable.
3. Visit https://YOUR-RETRO-SUBDOMAIN/api/health. Expect JSON containing service RetroBooth, build 0.7.0-alpha.1 and printer not_connected (the unchanged server does not own the Android printer).
4. Open /admin/ and enter your generated Admin key. Configuration errors must be fixed before using a real event.

### CORS configuration

The generated config permits the exact local test origin http://127.0.0.1:4173 and the packaged Android origin https://appassets.androidplatform.net. Same-origin /booth/ needs no extra entry. Add another trusted frontend ORIGIN explicitly when necessary; never use a wildcard or put a credential in a URL.

Default logical cloud quota is 2 GiB; a clip is limited to 64 MiB. Reserve additional disk space for chunk assembly and backups. Metadata quotas are not a guarantee of free hosting storage. The server must use HTTPS; plain HTTP is permitted only in the loopback CLI test harness.

## 04 / Create event and connect booth
Cloud Admin and Booth Control room are different screens

1. In Cloud Admin create a disposable event. Set its title and retention period (7/30/90/365 days in the UI).
2. Select that event. Create a device with a clear label, for example Android screen 01. Copy the complete setup bundle. This is an event-scoped credential; keep it private.
3. Open the local webcam app, your existing HTTPS preview, or /booth/?setup=1. Keep the same origin as before when you need its existing local recordings.
4. In Booth Admin open 07 / PRIVATE CLOUD DELIVERY. Paste the setup bundle. Click Verify + connect cloud.
5. Expect CONNECTED and 12 reserved QR links. The pasted secret is cleared from the textbox after successful verification.
6. Enable the real webcam AND microphone. Return to the booth and record a test clip. Demo mode deliberately never uploads a video.

### How the reserve works

The server creates separate owner and viewer credentials before recording. Claiming a reserved link is a local transaction; the link is consumed once and frozen to that recording. A cancelled or crashed attempt may consume a spare link, but it is not reassigned to another guest.

The pool normally contains 12 links and refills while idle when fewer than six remain. During an outage only the already reserved links can be used. When no links remain, cloud-mode Start is blocked with a message. Reconnect and refill, or deliberately choose Local-only for new recordings. There is no silent switch to a fake online link.

Changing the active event does not move earlier clips. Each pending clip retains its original server/event/device binding. Local-only affects NEW recordings; old cloud jobs still upload and receive deletion requests. Drain pending jobs before changing the approved server in the Android shell.

## 05 / End-to-end phone test
Prove the handoff with two devices before using real guest content

1. Record one full 10-second clip with camera and microphone enabled. Check that it is safely listed locally.
2. During the configured QR window, scan the code using a separate phone. It should open your HTTPS domain, not a local prototype marker.
3. A new page may say Your tape is on its way. The page polls every 10 seconds. Do not leave the guest standing at the booth waiting for upload.
4. After the booth returns to idle, the queue uploads in 512 KiB chunks. The cloud checks each chunk and the final size/SHA-256 before ready.
5. Play and download the clip on the phone. Compare the two CRT looks, sound, orientation and file playback on the target phones.
6. Keep the booth open. Disconnect its network during a second upload, reconnect, press Retry / sync now if required, and confirm already accepted chunks are not restarted unnecessarily.

### What is and is not guaranteed

The cloud does not transcode video. It preserves the browser-recorded MP4/WebM bytes. A correct hash proves byte identity, not iPhone codec compatibility, lip sync or playable content in every browser. Test your real encoder/phone combination.

New cloud work starts only while the single active booth tab is idle. A request already in flight may finish when recording begins; subsequent chunks wait. Avoid leaving multiple booth tabs open.

The local video is retained after successful upload. Browser storage can still be cleared, evicted or lost. This release does not replace native crash recovery or a verified external backup. Existing local-only recordings are not silently enrolled or uploaded.

## 06 / Guest privacy and deletion
Keep, hide, share or delete: these are separate operations

| Action / link | Result |
|---|---|
| Receipt / private guest link | Owner capability: view, download, Hide/Allow and reconfirmed Delete. Anyone holding this link has the same power. |
| View-only link | View/download only. Cannot change permission or delete. |
| Hide from live show | Keep private video; mark it excluded from future public use. Reversible. |
| Allow live show | Record guest permission only; staff approval remains separate. |
| Delete recording | Revoke online access, remove managed cloud media, request booth cleanup. |

There is no connected projector feed in v0.8. The server stores permission and staff approval for that future integration. Cloud-linked clips are excluded from the old local show preview to avoid treating stale offline permissions as current.

1. Open the owner link on the phone and press Hide. Confirm playback/download still work.
2. Open the view-only link from Booth Admin. Confirm it has no management controls. Do not forward the owner receipt link as though it were view-only.
3. Press Delete on the owner page. First cancel and confirm nothing was removed.
4. Open Delete again, tick the acknowledgement and confirm permanently. New media requests must stop.
5. While the booth is offline the phone reports waiting for local cleanup. Reconnect it; allow an idle sync; confirm the local video disappears and the phone reports cleanup acknowledged.

An active download, buffered bytes, exported files, external copies and independent backups cannot be recalled by this page. Deletion tombstones remain to stop delayed uploads recreating the video. These are limited metadata records, not playable media.

## 07 / Daily operation and recovery
Start with a pilot; keep a second recording/backup strategy

### Before a test event

1. Verify HTTPS, a disposable event, device credential and reserved-link count. Check disk/storage headroom, webcam framing and microphone routing.
2. Record, scan, play and download two full clips, one per style. Test with the actual Android screen and phones.
3. Set recording duration and QR time. Keep screen QR enabled while validating the new Android QR-only printer module.
4. Close older tabs. Export important videos before an update. Confirm you can locate and read your backup.

### At the end

Close NEW QR reservations in Cloud Admin only when appropriate. Previously issued spare links can still be used until expiry; closing reservations is not a remote shutter lock. Leave upload drain open so existing clips can finish. Revoke a device only after upload and deletion acknowledgements are complete; revoking it blocks both.

### Cleanup and backup

```text
php /ABSOLUTE/SITE/retrobooth_private/tools/cleanup.php
```

Run this CLI command from an hourly host Cron job using the host account's PHP CLI path. It purges expired media and stale (>24 h) incomplete chunks. A stale upload can re-send chunks; the immutable clip identity remains. Test the command manually before scheduling.

For a server backup, stop the booths, pause access/writes in a maintenance window and copy the complete private app/config/data together, including state.json, .initialized and all clips. Verify hashes and restore to a separate private test location. This release does not automate backup/restore. Never restore stale metadata without reconciling newer deletion tombstones: that could resurrect deleted access.

## 08 / GitHub repository and build
No automatic deployment or credential upload

1. Extract GitHub Ready. Open the RetroBooth folder and confirm it contains package.json, src, cloud, android, tools and .github.
2. Using GitHub Desktop, create a new PRIVATE repository, or use a clearly isolated branch of your existing RetroBooth repository.
3. Copy the CONTENTS of RetroBooth into the repository root, including hidden .github. Do not put another RetroBooth folder around the project or upload only the ZIP.
4. Review changed files. Exclude config.php, cloud runtime data, private setup bundles, test recordings, passwords and signing keys. Commit and push the source.
5. Ensure .github/workflows/build-all.yml is on the default branch. Open Actions > RetroBooth - Build all test versions > Run workflow.
6. Leave required localhost integration tests enabled for a normal runner. Build Android can be disabled for a web-only iteration. Open a failed job log; do not treat a missing artifact as success.

### Expected artifacts

| Artifact | Contains |
|---|---|
| RetroBooth-Web-v0.8-RUN | Standalone HTML, Local Webcam ZIP, Static Preview ZIP, Hostinger Cloud Alpha ZIP and checksums. |
| RetroBooth-Android-v0.8-RUN | TEST APK plus UNSIGNED APK/AAB, only if the Android job succeeds. |
| Test/Android Evidence | Logs and screenshots, NOT the installation program. |

This repository does not build historical versions, native EXE/DMG installers or an iOS IPA. Both TV styles are already inside each app. A workflow builds files; it does not upload them to Hostinger or publish an app store release.

GitHub Actions was not run in your account during this delivery. Android compilation still needs a successful runner with JDK 17, Gradle 8.11.1, Android SDK 35 and the pinned Android Gradle plugin 8.9.1.

## 09 / Android TEST APK
Same application ID; native build and hardware acceptance remain open

1. After a successful Android job, download RetroBooth-Android-v0.8-RUN. Install RetroBooth-v0.8-Android-TEST.apk on the test screen. An AAB or unsigned APK is not the directly installable test file.
2. Export local videos before uninstalling, clearing storage or replacing a build signed by a different key. Never fix an update error by immediately deleting the old app.
3. Allow camera and microphone. Select the intended devices and test actual USB camera/audio routing. Browser recognition is device-dependent.
4. Paste the Cloud Admin device bundle in Booth Admin. The native shell asks permission to contact that exact HTTPS server. Check the host before approving.
5. Test recording, upload, offline recovery, phone playback, deletion, export and a long-running session on this physical device.

### Signing for repeat builds

A clean CI runner may generate a different temporary debug key. For stable test upgrades, keep a private test keystore and set RETRO_TEST_KEYSTORE_BASE64, RETRO_TEST_STORE_PASSWORD, RETRO_TEST_KEY_ALIAS and RETRO_TEST_KEY_PASSWORD in repository Actions secrets. Detailed commands are in docs/ANDROID_SIGNING.md. Never commit the keystore.

### Security boundary

The WebView loads packaged assets at its local appassets HTTPS origin. Its source allows API requests only to the single operator-approved cloud host and /api/ paths; arbitrary remote page navigation remains blocked. Open guest pages on a phone or separate browser, not inside the locked test shell.

The media engine remains WebView/MediaRecorder/IndexedDB. This release adds independent secure-SPP QR sending, but not native crash-proof media storage, managed kiosk lockdown or a paper sensor. Source/JVM checks do not constitute APK compilation or device validation.

## 10 / Upgrade, rollback and troubleshooting
Preserve evidence and media; do not reset a broken database

The v0.5 database/schema and Android application ID are retained. v0.8 adds optional per-clip ticket metadata and a separate native hash-only ticket journal. It does not rewrite old video data or change the v0.7 cloud API. Same browser origin/app ID/signing identity are required for existing local data.

| Problem | Action |
|---|---|
| QR says NO ONLINE VIDEO | It is demo/local-only or an older clip. Configure cloud, reserve links and record a NEW real clip. |
| No reserved links | Reconnect and refill; otherwise explicitly choose local-only for new clips. |
| Setup required / invalid origin | Check private config location, unique secrets, canonical root HTTPS origin and TLS. |
| Origin not allowed | Add only your exact trusted frontend origin to corsOrigins. Paths do not belong there. |
| Upload waiting | Keep booth open and idle. Check connectivity, credential, quota, expiry and upload drain. Retry/sync. |
| Media cannot play | Compare local file; check codec and Range behavior on real phones. No automatic transcoding. |
| Metadata corrupt / missing | Stop writes. Restore a verified consistent backup; do NOT delete state to reinitialize. |
| Deletion still pending | Reconnect the original booth with its active credential. Check disk cleanup and sync; exports cannot be recalled. |

Before rolling back to v0.7, export important recordings, disconnect the printer and leave the native ticket journal intact. v0.7 cannot issue native tickets but still handles existing v0.7 cloud jobs. Rolling back further to v0.6 also disables cloud-job and remote-deletion processing; first finish uploads and cleanup acknowledgements and retire credentials deliberately.

Browser or APK rollback is not a database downgrade tool. Restore source files from a tagged backup, retain the same app ID/key, and increase versionCode for an intentional Android rollback build if the installer requires it. Test on disposable data first.

## 11 / Technical limits and acceptance
What the checks prove, and what still needs a real environment

Cloud storage is a single-host private-file pilot. The configured logical quota defaults to 2 GiB, with 64 MiB per clip, 100 events and 5,000 total reservations/tombstones. Unused and deleted identities count toward that pilot limit. It is not a multi-tenant database or public video hosting platform.

The backend uses cooperative file locks, same-directory temporary writes, fsync, immutable upload metadata, per-chunk and final SHA-256 checks, and deletion-first access revocation. Its header check recognizes an MP4/WebM container signature; it is not full media validation, malware scanning or transcoding.

Cloud Admin uses a unique bearer secret, not account passwords/MFA. Owner and view-only links use separate random capabilities. Media cookies are short-lived and checked against current deletion status. Admin sign-out clears the page key and video, but existing media grants can remain until their 15-minute expiry unless the clip is deleted.

### Required acceptance before live guests

1. Run the included API tests and required true-origin browser tests in an ordinary environment. Verify Hostinger HTTPS, headers, rewrite rules, CORS, filesystem permissions/locking and Cron.
2. Use actual Android camera/audio hardware: 10/30/60-second sync, disconnect/reconnect, sleep/wake, export, thermal endurance and storage exhaustion.
3. Test phone playback/download on your target iOS/Android browsers. Simulate network loss and Delete during an incomplete upload.
4. Confirm backups, retention and access control. Do not enable automatic printing for guests until the paper acceptance checklist passes. Remote projector playback remains disconnected.

### Reference documentation

PHP: php.net/manual/en/function.flock.php and function.fsync.php. Android: developer.android.com/develop/ui/views/layout/webapps/load-local-content. GitHub: docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow. These describe platform behavior; they do not certify this release.

See docs/TEST_REPORT.md and qa/ for exact executed tests and non-results. The H5.3 handoff archive remained inaccessible. This is an independently written adapter against the available RetroBooth source and public platform documentation, NOT a validated H5.3 port.

## 12 / Pair and connect the printer
Android APK only. No printer is selected automatically.

Use a Bluetooth Classic SPP printer that supports native ESC/POS Model 2 QR commands. The advertised Bluetooth name alone does not establish compatibility. This is not BLE, USB or an Android system-print plugin.

1. Build the TEST APK using the GitHub workflow and install it on the actual Android screen. Export recordings first; retain the same signing key for updates. Opening /booth/ in Chrome does NOT activate this module.
2. In Android Bluetooth settings pair your dedicated printer. Enter only the PIN specified by the printer vendor. The app does not scan or silently pair devices.
3. In Booth Admin open 08 / ANDROID BLUETOOTH QR TICKETS. Grant Nearby devices access on Android 12+. Refresh paired devices.
4. Choose the exact name AND Bluetooth address. Press Pin selected printer and confirm the native dialog. Another printer with the same name is never substituted.
5. Press Connect secure SPP. A connected label means a transport connection, not paper ready. If secure connection fails, there is no insecure fallback.
6. Press Print diagnostic QR and confirm. Scan the paper and inspect the entire encoded example.invalid diagnostic URL. It is deliberately NOT a video link.

### Reset and reconnect rules

Disconnecting, leaving the app, locking the device, or a transport failure clears automatic-print permission and fast-return acceptance. Reconnect explicitly and re-enable automatic tickets. There is no background reconnection or queue replay. A permission dialog may also interrupt a connection on some devices.

Native connection deadline: 8 seconds. One active send only. The print deadline is 1-15 seconds; default 4 seconds follows the existing QR setting. A timeout closes the socket. Inspect paper and the journal before any intentional reprint.

## 13 / First private QR ticket
Test manually before automatic recording-to-paper operation.

1. Connect your private cloud under section 07. The bundled Android app asks you to approve that exact HTTPS root origin. Old local-only recordings are not automatically uploaded.
2. Record a NEW webcam + microphone clip in cloud mode. Keep the timed screen QR and check phone playback or the pending-upload page.
3. Return to section 08, refresh the saved recordings list, and explicitly select that message. Print selected once uses its frozen QR, not the newest recording or the active event.
4. The native dialog warns that this is the owner link with Delete access. Confirm deliberately. Expected journal result after transmission is sent_unconfirmed, never printed-confirmed.
5. Scan the complete paper QR. It must exactly match the selected message and open the correct private guest page. Verify all URL characters including the fragment after #. Do not post this URL in logs, chats or a public repository.
6. Pressing Print selected once again uses the same job ID and does NOT resend it. Reprint SAME link is a separate explicit action with native confirmation, a new job ID and a link to the original journal entry.

### Paper format in this pilot

ASCII RETROBOOTH label, numeric message number and native QR. Maximum QR payload: 256 printable ASCII bytes, exact HTTPS /guest/# capability on the approved server. Model 2, error correction M, 4 dots/module; no automatic cutting. Actual printer width, quiet zone, firmware support and scan quality must be measured.

The on-screen receipt designer and Game Boy snapshot remain available as previews/exports. Their snapshot, logo, custom caption, Chinese text and layout are NOT sent by this QR-only native profile.

## 14 / Automatic tickets and QR fallback
Connected is not printed. Safe fallback is the default.

1. After the manual paper test, enable Automatic QR tickets in section 08 and accept the native prompt. This permission lasts only for the current connection/session.
2. In 06 / QR & AUTO RETURN enable the receipt-print route. Start with Print + always show screen QR. Save settings. Both the web route and native session permission must be enabled.
3. Record again. The video is committed locally before a ticket request. One immutable job ID is used per recording, with the exact saved cloud link.
4. Keep the printer attended. On a send error, unknown outcome, timeout or mismatch, the screen QR remains for its configured duration, then the booth returns to Start. Failed local VIDEO saving still blocks the guest flow.

| Journal outcome | Operator meaning |
|---|---|
| sent_unconfirmed | All writes/flush returned. Paper may still be absent, unreadable or incomplete. |
| failed_before_send | No transmission was attempted for that journal entry. No automatic replay. |
| outcome_unknown | Some bytes may have left the app, or the process was interrupted. Inspect paper before deciding on a deliberate reprint. |
| Duplicate ID | Existing record returned; no fresh transmission and no QR bypass. |

The native journal stores identifiers, state and hashes, not the full private URL or the snapshot. It is persisted before sending. Old unfinished records become unknown on restart and are not replayed. Corruption, locking or commit failure disables printing rather than resetting the journal.

## 15 / Optional faster hand-off
Explicit operator-risk acceptance; no electronic paper sensor.

Leave this OFF during initial acceptance. This option can hide the screen QR even when paper has run out or the print is unreadable. It does not turn sent_unconfirmed into a physical-success claim.

1. On the current dedicated connection, print and scan a real guest ticket, not the diagnostic QR. Keep automatic-print permission enabled.
2. Expand Unconfirmed-paper fast return. Enter the journal ticket ID and paste the COMPLETE scanned URL into the masked field. The field is cleared after the request.
3. The native module compares the hash to a sent_unconfirmed guest ticket from the same printer and connection. In the native dialog, decide whether to accept the stated risk. This is your declaration; the app cannot prove you scanned paper.
4. Select Smart in QR & AUTO RETURN. After a matching validated native send, the booth can skip the QR screen and use your configured thank-you time (0 seconds returns directly). Always-show screen mode still wins.
5. Use Disable fast return to restore the safe default. Acceptance expires on pause, disconnect, failure or after four hours. A different origin/profile, larger URL, duplicate result, late result or unknown outcome cannot use the acceptance.

### Deletion and physical copies

Cloud/local deletion revokes the clip in the native journal when the booth processes that change. An active send is cancelled; bytes already accepted by the printer cannot be recalled. If native revocation cannot be committed, disconnect the printer and investigate. Offline copies already handed out cannot be remotely erased.

The ticket journal is capped at 9,999 entries and is not silently compacted. Do not clear app storage to free it: that also risks recordings, credentials and deduplication history. Maintenance needs a separate verified backup/retirement procedure.

## 16 / Paper acceptance checklist
Pass these on the actual screen and printer before event use.

1. Complete the ordinary GitHub build, native lint and real-origin tests. Install the TEST APK without deleting existing media. Confirm version 0.8 / versionCode 8.
2. Test Nearby devices denial and later approval; Bluetooth off/on; paired-but-offline printer; same-name second printer; pin persistence; pause and reconnect.
3. Print diagnostic and real guest tickets. Independently compare the full scanned URL to the immutable saved URL. Test your longest expected origin/URL, not just a short demo.
4. Run at least 30 successive recordings/tickets on both TV styles. Check link identity, duplicate prevention, paper order, QR readability and physical feed. Then test idle timeout and power cycle.
5. Test no paper, cover open, weak power and interruption during send. The app cannot measure paper state; verify safe default screen QR and unknown-outcome handling. Do not enable fast return unattended.
6. Test a selected older recording and an explicit same-link reprint. Delete before send, during send and while the booth is offline. No deleted clip should start a new job after revocation is processed.
7. Perform a three-hour hardware soak with camera, mic, cloud queue and printer. Check heat, storage, sound sync, upload drain and backups. No soak or physical print was performed for this source delivery.

Android platform references: developer.android.com/develop/connectivity/bluetooth/bt-permissions and /connect-bluetooth-devices. Native QR command reference: Epson ESC/POS GS ( k functions 165, 167, 169, 180 and 181. These APIs do not certify compatibility of any untested printer.

GitHub setup-gradle v6 caching is explicitly disabled. No proprietary Gradle caching component is used by this workflow. Check action/runtime and hosted-runner requirements before running.
