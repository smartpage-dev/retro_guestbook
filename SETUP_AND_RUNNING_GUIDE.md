# RetroBooth v0.9

Android APK + Windows EXE | Independent GitHub builds & device guide

Luce Studio / 0.9.0-alpha.1 / 23 November 2026

One source repository, two application targets. Keep both CRT styles, film-colour webcam treatment, fixed-duration recording, local saving, timed QR hand-off and private cloud delivery.

| Build target | What the workflow produces |
| --- | --- |
| Android | An installable, signed TEST APK. Native secure-SPP QR-only pilot retained. |
| Windows x64 | An assisted installer EXE and a no-install portable EXE. Webcam, microphone, local library and cloud; no native printer driver. |
| Windows ARM64 | Optional additional build. The packaged ARM64 executable still needs ARM64 device acceptance. |
| Web / cloud | Standalone HTML, local webcam, static preview and private PHP hosting ZIPs. |

## Start here

Extract RetroBooth_v0.9_Android_Windows_GitHub_Ready.zip. Copy the CONTENTS of its RetroBooth folder into your repository root, including .github. Run the named Actions workflow. Download programs from Artifacts, not from the source ZIP.

## Build source is not a certified event release

The delivered ZIP contains source and separate build/verification workflows, not precompiled APK/EXE files. The native toolchains were unavailable in the authoring environment; the first GitHub run must prove compilation and runtime checks. Physical cameras, printers and event endurance require acceptance on each device.

# 01 / Put the project on GitHub

One private repository; three independent manual workflows; no hosting keys in source

1. Extract the ZIP locally. Inside RetroBooth, confirm package.json, src, android, desktop, cloud and the hidden .github folder exist.
2. In GitHub Desktop create a PRIVATE repository, or select a clearly isolated branch of an existing RetroBooth repository. Copy the project contents into that repository folder.
3. Check that .github/workflows/build-android.yml, build-windows.yml and verify-all.yml are directly below the repository root. Do not upload only the ZIP or put the source under another nested RetroBooth folder.
4. Review changes. Never commit guest recordings, cloud config.php, runtime data, device bundles, passwords, keystores or certificates. Commit the source and push.
5. Ensure the workflow exists on the default branch. Open Actions, choose RetroBooth - Build Android APK or RetroBooth - Build Windows EXE, then Run workflow. Run RetroBooth - Full Verification separately before event use.
6. Choose the desired platform workflow independently. Windows ARM64 is optional and off by default. Start the run.

```text
repository-root/
  .github/workflows/build-android.yml
  .github/workflows/build-windows.yml
  .github/workflows/verify-all.yml
  package.json
  src/
  android/
  desktop/
  cloud/
  tools/
```

The workflow has read-only repository permissions and does not push changes, publish a Release, deploy Hostinger or upload store listings. GitHub account policies, hosted-runner access and any Actions usage allowance must permit the jobs.

## No Run workflow button?

Check the default branch, hidden .github folder, correct repository root and write access. This workflow is manual; a source upload alone does not start it.

# 02 / Download the right files

Programs, unsigned developer outputs and evidence are separate

Open the workflow run summary. Inspect the chosen platform job; Full Verification runs separately and remains a required acceptance gate before live events. Do not treat a missing program or an evidence-only artifact as success.

| Artifact name (RUN is the run number) | Use |
| --- | --- |
| RetroBooth-Android-APK-v0.9-RUN | Installable TEST APK, signature fingerprint, build information and SHA-256 hashes. |
| RetroBooth-Windows-x64-EXE-v0.9-RUN | Windows installer and portable program, hashes and quick-start instructions. |
| RetroBooth-Windows-arm64-EXE-v0.9-RUN | Optional ARM64 programs, not an x64 replacement. |
| RetroBooth-UNSIGNED-DEVELOPER-FILES-v0.9-RUN | Unsigned APK/AAB for developer signing. Not the file to install on the booth. |
| Names containing Evidence | Logs, screenshots, resolved lockfile or reports. Not installation programs. |

## Expected program filenames

```text
RetroBooth-v0.9-Android-TEST.apk
RetroBooth-0.9.0-alpha.1-Windows-x64-Setup.exe
RetroBooth-0.9.0-alpha.1-Windows-x64-Portable.exe
```

Programs are requested to remain in Actions for 30 days; most evidence for 14. Repository policy may shorten retention. Download and archive the successful build, hashes and signing fingerprint.

## Failed job

Open the first failing step and keep its log. Source verification and real-origin checks are required; do not bypass a failing test to describe the release as validated. Android and Windows jobs can succeed or fail independently after Verify passes.

# 03 / Android APK

Same application ID, versionCode 9

1. Download and extract the Android-APK artifact after a successful Android job. Use the TEST.apk, not the unsigned APK or AAB.
2. Before updating an existing installation, export important recordings and retain the same signing identity. Do not uninstall or clear data to get around an update error.
3. Transfer the APK to the intended Android device. Review its origin and signature; permit installation from that source as needed for this test app.
4. Open RetroBooth, allow camera and microphone and, for printing, Nearby devices. Check real USB webcam/audio recognition on that device.
5. Enter Admin by tapping the version label five times or holding CH 03 for five seconds. Open Camera Lab, enable camera + microphone and select the intended inputs.
6. Record one 10-second clip in each CRT style. Check local playback, sound, export and automatic QR return before connecting cloud or printing.

Source minimum is Android 8/API 26; the intended screen is Android 12, still requiring hardware validation. Modern WebView features, actual camera routing and storage can vary. One APK contains no architecture-specific native media libraries, but that does not guarantee every device works.

## Bluetooth QR pilot remains Android-only

Pair the printer in Android settings, then pin its exact address in Admin section 08. Use secure Classic SPP and a compatible native ESC/POS QR profile. Test a diagnostic ticket, then a real selected private QR. There is no BLE/USB/raster snapshot support in this paper path.

Default send result is sent_unconfirmed, not paper-confirmed; keep timed screen QR enabled initially. Unknown jobs never auto-replay. The detailed connection, reprint and fast-return checklist is preserved in history/v0.8/SETUP_AND_RUNNING_GUIDE.md, sections 12-16.

# 04 / Windows EXE

Choose installation or portable launch on a Windows test PC

1. Download the Windows-x64-EXE artifact and extract it. Use x64 for an ordinary 64-bit Intel/AMD Windows PC. Windows 11 x64 is the primary acceptance target; Windows 10 is not separately validated.
2. For a normal app shortcut, run the Setup.exe and follow the per-user installation wizard. For no installation, run Portable.exe from a local folder.
3. These are unsigned internal-test programs. Windows or your organisation may warn or block them. Check the source and hashes; do not disable system security globally. Public distribution needs a separate signing/reputation plan.
4. At first launch, Admin opens. Enable webcam + microphone and accept the native permission prompt. Windows privacy settings must also permit desktop camera and microphone access.
5. Select inputs and record a test. Use F11 or Admin section 09 for full screen. Full screen is not managed kiosk lockdown.
6. Export a clip from Tape library and choose a destination in the native Save dialog. Confirm the saved file plays independently.

## No Node.js or Java installation on the event PC

The generated Windows EXEs bundle the application runtime. The end-user PC does not need the source tree, npm or a local web server. The PHP cloud service remains a separate deployment.

## Where recordings live

```text
%APPDATA%\Luce RetroBooth
```

Installed and portable editions share this profile for the same Windows account, and only one instance runs. Portable describes the executable, not the recordings: moving the EXE to another PC does not move clips, credentials or settings.

Windows Bluetooth, USB and Windows RAW receipt printing are NOT connected in this release. Admin explicitly reports that limitation; screen QR remains the delivery route. Do not use the Android printer setup as a Windows instruction.

# 05 / Cloud on several devices

One cloud event; a separate device identity on each booth

The original private PHP server remains separate from APK/EXE packaging. Cloud is OFF until configured. A deployed cloud service is required for real phone-viewing QR links; local/demo markers are not online videos.

1. For a new server, follow the existing hosting instructions in history/v0.8/SETUP_AND_RUNNING_GUIDE.md, sections 02-07. Put only public_html contents in the website root. Keep retrobooth_private outside every public webroot.
2. For an EXISTING server, back up its private configuration and add the exact Windows origin below to corsOrigins. Preserve its publicOrigin, admin/signing secrets, dataDir and other trusted origins. Do not regenerate configuration or erase server data.
3. Create an event and a distinct device credential for each Android or Windows installation. Paste that device bundle into Admin section 07.
4. Confirm the native prompt for your exact public HTTPS cloud hostname. Finish outstanding jobs before changing server: only one approved cloud host is allowed by each native shell.
5. Check the reserved QR pool, record a NEW real clip and scan its QR with another phone. Wait for upload, then test playback, download, Hide and reconfirmed Delete.

```text
'corsOrigins' => [
    'https://your-trusted-booth-host.example',
    'https://appassets.androidplatform.net',
    'retrobooth://app',
],
```

The example hostname is a placeholder, not an additional origin to copy blindly. Keep only actual trusted origins. Do not use wildcard CORS or disable TLS checks. New generated configurations already include the desktop origin.

## Independent devices are not a shared local library

Each device has its own local recordings, queue and printer state. They may upload to the same cloud event with separate credentials, but the EXE/APK does not synchronize the local library. Owner QR links permit deletion and should remain private. Existing old local-only clips are not automatically uploaded.

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

# 07 / Run, export and troubleshoot

A short device acceptance routine before any event

1. Use a disposable event first. Confirm both CRT styles, microphone meter and 10/30/60-second automatic stop with visible speech/clapping sync.
2. Close and reopen after a completed save. Confirm the clip remains, then export it and play the independent file on another device.
3. Test timed QR expiry, different next-guest QR, cloud upload pause/resume, short network loss and an exhausted QR reserve.
4. Test phone Hide and reconfirmed Delete, including a booth that is temporarily offline. Do not claim already downloaded copies are erased.
5. On Android only, verify exact paper QR contents and deliberate same-link reprint. Leave default screen QR on until paper acceptance is complete.
6. Run a sustained session, monitor heat, storage and audio, then finish uploads and verify your exports before shutting down.

| Symptom | What to check |
| --- | --- |
| Windows will not open | Correct x64/ARM64 output, security policy, Windows support and first native build log. Do not globally disable protection. |
| Camera/mic unavailable | OS privacy permissions, another app using the device, selected input and USB hub power. |
| Cloud rejected on Windows | Exact retrobooth://app in server corsOrigins; correct HTTPS root and native approval. |
| APK update rejected | Signing fingerprint and package ID. Export first; do not clear storage as a first response. |
| Old clips absent on Windows | Electron uses a NEW origin/profile, separate from Chrome and Android. No automatic migration exists. |
| EXE is on USB but clips are not | Clips belong to the Windows account profile. Export verified files deliberately. |

The close warning can prevent an accidental exit; it cannot save an unfinished clip after a crash, power loss or forced termination. Browser/IndexedDB persistence is not a certified crash-proof recorder.

# 08 / Build details and evidence

Separate source checks from native execution and hardware acceptance

| Gate | What the workflow requires |
| --- | --- |
| Verify / Ubuntu | Current unit contracts, JVM ticket core, real PHP API tests, browser regression and true-origin persistence/cloud checks. |
| Android / Ubuntu | JDK 17, Gradle 8.11.1, AGP 8.9.1, SDK 35; APK/AAB compilation, lintDebug, APK signature and package/version checks. |
| Windows / Windows runner | Install pinned tooling, actual Electron smoke with fake camera and real isolated storage, package EXEs, then launch packaged x64 app in smoke mode. |
| Optional ARM64 | Build ARM64 files after x64 development-runtime smoke. Does not execute the ARM64 binary on the x64 runner. |

The Windows smoke gate checks secure bundled origin, restricted bridge, CSP, real IndexedDB reload, synthetic recording, export and disabled Windows printer controls. It is implemented in the repository but has NOT run in the authoring environment. Successful CI is not physical-camera or thermal/endurance proof.

## Local developer commands (not needed for GitHub-only use)

```text
npm run desktop:prepare
npm test
npm run desktop:install
npm run desktop:start
# On Windows, after tooling installation:
npm --prefix desktop run package:win:x64
```

See docs/TEST_REPORT.md for executed evidence and explicit non-results, docs/MIGRATION_AND_ROLLBACK.md for preservation rules, SOURCE_PROVENANCE.json for baseline hashes, and docs/PLATFORM_REFERENCES.md for official documentation. Native outputs are available only after their successful platform job.

## Updated workflow instructions (24 Nov 2026)

The workflows are now independent. For exact setup and removal of the old combined workflow, see `docs/SPLIT_WORKFLOWS_SETUP.md`. The historical Word guide may still describe the older combined workflow; use this Markdown guide for GitHub Actions steps.
