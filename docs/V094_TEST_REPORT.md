# RetroBooth v0.9.4-alpha.1 — Scoped Release Validation

**Scope:** Android + Windows source, independent GitHub workflows, private Hostinger PHP Cloud, per-event folder storage and end-of-event ZIP delivery. Tests run in a Linux container with real PHP built-in HTTP backend, synthetic video, fake browser media and fake printer transport. No physical Android APK, camera, Windows EXE, Hostinger production deployment, printer or guest-phone QR scan performed here.

## Verified in this session

- Source compiled to standalone/desktop assets using `npm run desktop:prepare`; complete Node/source suite `npm test` passed, including 46 Electron/desktop safety assertions.
- Java JVM native ticket core tests: **57 passed**, fake transport. Source repository and workflow checks passed, `.github` has only Android/Windows/Full Verify independent workflow files.
- All `cloud/**/*.php` syntax checked using `php -l`.
- Real PHP HTTP integration `python tests/cloud_api.py`: **104 assertions passed** using generated H264/AAC test media, private temporary storage, verified resumable uploads and SHA256 validation, owner/view-only permissions, delete/revoke, per-event path, standalone PHP ZIP worker, ZIP CRC/content inspection using Python `zipfile`, client HTTP authorization with HttpOnly cookie, HTTP ranges, rotating/revoking client token, and deleted-clip archive invalidation.
- Chromium browser regression (synthetic/media mocks, **not actual camera/Hostinger**):
  - v07 booth-cloud: **32 passed** including HTTPS QR payload, reserved link before capture, upload after local save and remote delete.
  - v07 guest page: **14 passed**.
  - v07 Hostinger Admin: **12 passed** including event management layout at 320/390/800/1440.
  - v06 demo QR geometry: **82 passed** over both screen styles and viewports.
  - v06 real local-only guard: **7 passed**, including hiding unusable QR for real recording without Cloud.
  - v094 client ZIP download page: **11 passed**, including mobile 320/390/800 UI, no access token in download URLs and no obsolete links on invalid token.

## Functional constraints and required end-to-end acceptance

1. Run GitHub Actions Android test APK and Windows EXE builds; **native compilation was not performed in this local session**.
2. Test Android 13 (and intended event kiosk device) **with a stable TEST signing key**, camera/microphone capture, retained local library, real event Cloud binding, live QR scanning from second phone, upload ready and playback/download.
3. Deploy cloud to Hostinger with the existing private config and data kept outside public webroot, enable dedicated PHP CLI cron ZIP worker and cleanup worker, ensure PHP/Storage quotas, and complete real client link / separate ZIP downloads on both Android and iPhone browsers.
4. Verify guest consent/privacy and data-retention policy before sharing *all* videos, including guest-hidden clips. A previously deleted clip cannot be recovered and must not enter new ZIPs.
5. Load test 20+ simultaneous client video downloads, interrupted uploads/download resumes and archives near configured storage quota if used at commercial events. This **has not been completed**.
6. Validate private share token expiry/revoke and multi-part ZIP downloads with a non-mocked real client browser on the deployed domain.

**Security stance:** Cloud Alpha, event consent required; client link secret bearer is single-party authorization. It can be copied by anyone holding it, and downloaded files cannot be recalled after sharing. No Android/Windows printer hardware validated.
