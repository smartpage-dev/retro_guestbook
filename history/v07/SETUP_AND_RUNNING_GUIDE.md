# RetroBooth v0.7 - Setup & running guide

## RetroBooth v0.7
Setup & running guide | Private cloud delivery alpha

Luce Studio / 0.7.0-alpha.1 / 23 November 2026

One Start action. Fixed recording time. Local save. Timed QR. Return to Start. The two CRT designs and their webcam effects stay in the same application.

### What this release adds

An opt-in PHP cloud service, pre-reserved private QR links, hash-verified resumable uploads, a guest viewing/download page, remote Hide/Delete, and a separate Cloud Admin. Cloud delivery stays OFF until you deploy and connect your own server.

### Choose the correct package

| Package | Purpose |
|---|---|
| Local Webcam Test | Desktop camera/microphone and local recording test. |
| Hostinger Static Preview | Frontend only; no PHP backend inside this ZIP. |
| Hostinger Cloud Alpha | Public website plus separate PRIVATE PHP application. |
| GitHub Ready | Editable source, tests, workflow, Android test-shell source. |

### Important release boundaries

Physical QR printing is still disconnected. The confirmed-print bypass is DEMO-only. No remote projector feed, native crash-recoverable recording, multi-user accounts or MFA is included. No APK/AAB was compiled here. This is a development alpha, not an event-ready system.

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

Tap the right-panel v0.7 / PREVIEW label five times, or hold CH 03 for five seconds. This is a hidden entry gesture, NOT a password or security boundary. Keep the booth supervised or use managed device restrictions.

### Useful defaults

| Setting | Default / range |
|---|---|
| Recording | 10 seconds; 10 / 30 / 60 available. |
| QR window | 10 seconds; 5-60 seconds. |
| Camera look | Follow style: Edge colour film / Heritage soft mono. |
| Physical print | Not connected; real captures keep the screen QR. |

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
3. Visit https://YOUR-RETRO-SUBDOMAIN/api/health. Expect JSON containing service RetroBooth, build 0.7.0-alpha.1 and printer not_connected.
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

The local video is retained after successful upload. Browser storage can still be cleared, evicted or lost. This release does not replace native crash recovery or a verified external backup. Existing v0.6 recordings are not silently enrolled or uploaded.

## 06 / Guest privacy and deletion
Keep, hide, share or delete: these are separate operations

| Action / link | Result |
|---|---|
| Receipt / private guest link | Owner capability: view, download, Hide/Allow and reconfirmed Delete. Anyone holding this link has the same power. |
| View-only link | View/download only. Cannot change permission or delete. |
| Hide from live show | Keep private video; mark it excluded from future public use. Reversible. |
| Allow live show | Record guest permission only; staff approval remains separate. |
| Delete recording | Revoke online access, remove managed cloud media, request booth cleanup. |

There is no connected projector feed in v0.7. The server stores permission and staff approval for that future integration. Cloud-linked clips are excluded from the old local show preview to avoid treating stale offline permissions as current.

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
3. Set recording duration and QR time. Real printing remains disconnected, so keep screen QR enabled.
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
| RetroBooth-Web-v0.7-RUN | Standalone HTML, Local Webcam ZIP, Static Preview ZIP, Hostinger Cloud Alpha ZIP and checksums. |
| RetroBooth-Android-v0.7-RUN | TEST APK plus UNSIGNED APK/AAB, only if the Android job succeeds. |
| Test/Android Evidence | Logs and screenshots, NOT the installation program. |

This repository does not build historical versions, native EXE/DMG installers or an iOS IPA. Both TV styles are already inside each app. A workflow builds files; it does not upload them to Hostinger or publish an app store release.

GitHub Actions was not run in your account during this delivery. Android compilation still needs a successful runner with JDK 17, Gradle 8.11.1, Android SDK 35 and the pinned Android Gradle plugin 8.9.1.

## 09 / Android TEST APK
Same application ID; native build and hardware acceptance remain open

1. After a successful Android job, download RetroBooth-Android-v0.7-RUN. Install RetroBooth-v0.7-Android-TEST.apk on the test screen. An AAB or unsigned APK is not the directly installable test file.
2. Export local videos before uninstalling, clearing storage or replacing a build signed by a different key. Never fix an update error by immediately deleting the old app.
3. Allow camera and microphone. Select the intended devices and test actual USB camera/audio routing. Browser recognition is device-dependent.
4. Paste the Cloud Admin device bundle in Booth Admin. The native shell asks permission to contact that exact HTTPS server. Check the host before approving.
5. Test recording, upload, offline recovery, phone playback, deletion, export and a long-running session on this physical device.

### Signing for repeat builds

A clean CI runner may generate a different temporary debug key. For stable test upgrades, keep a private test keystore and set RETRO_TEST_KEYSTORE_BASE64, RETRO_TEST_STORE_PASSWORD, RETRO_TEST_KEY_ALIAS and RETRO_TEST_KEY_PASSWORD in repository Actions secrets. Detailed commands are in docs/ANDROID_SIGNING.md. Never commit the keystore.

### Security boundary

The WebView loads packaged assets at its local appassets HTTPS origin. Its source allows API requests only to the single operator-approved cloud host and /api/ paths; arbitrary remote page navigation remains blocked. Open guest pages on a phone or separate browser, not inside the locked test shell.

This is still a WebView/MediaRecorder/IndexedDB shell. It has no secure SPP printer driver, managed kiosk lockdown, native crash-proof media journal or certified paper-status telemetry. Fullscreen alone is not an Android kiosk policy. Source checks are not APK compilation or device validation.

## 10 / Upgrade, rollback and troubleshooting
Preserve evidence and media; do not reset a broken database

The v0.5 database name/schema and Android application ID are retained. v0.7 adds auxiliary settings, one-use QR claims and per-clip cloud metadata without rewriting older videos. The same origin/browser is required to see existing local data.

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

Before rolling back to v0.6: export important clips; finish cloud uploads and cleanup acknowledgements; close new issuance and explicitly stop the device credential when no further jobs are needed. Old v0.6 cannot process v0.7 cloud deletion requests. Keep cloud state/media and backups; do not delete the private folder.

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
4. Confirm backups, retention and access control with the event operator. Keep physical printing and remote slideshow disabled until separately integrated and tested.

### Reference documentation

PHP: php.net/manual/en/function.flock.php and function.fsync.php. Android: developer.android.com/develop/ui/views/layout/webapps/load-local-content. GitHub: docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow. These describe platform behavior; they do not certify this release.

See docs/TEST_REPORT.md and qa/ for exact executed tests and non-results. The original H5.3 handoff ZIP could not be re-opened with authorized byte access in this turn; no new driver reuse or physical printer integration is claimed.

