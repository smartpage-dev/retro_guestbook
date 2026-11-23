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
