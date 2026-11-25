# RetroBooth v0.9.4 - Patch v0.9.3 GitHub source

- Unzip onto **repository root**, next to package.json. Keep hidden .github folder.
- Do not overwrite or reset cloud/retrobooth_private/config.php, data/, local recordings, keystores, or secrets.
- This is a source patch for an existing full v0.9.3 repo. If source is incomplete, use the v0.9.4 COMPLETE GitHub Ready ZIP instead.
- Commit and push to main with GitHub Desktop. Do NOT restore legacy .github/workflows/build-all.yml.
- In GitHub Actions independently run RetroBooth - Build Android APK (TEST APK, versionCode 13), then Windows EXE only if desired. Full Verification separately.
- Deploy the *separate* v0.9.4 Hostinger Cloud Alpha ZIP, preserving private config/data; install Hostinger Cron PHP ZIP worker. See docs/V094_EVENT_CLOUD_SHARE_SETUP_ZH.md.
- There is no working guest QR for real videos if Cloud is LOCAL-ONLY: set up Event and Verify+connect bundle BEFORE recording. Previous local-only clips are not auto-uploaded.
- Before APK update, export old recordings and use the same signing key; APK builds are not included here.
- No Hostinger deployment or physical phone end-to-end acceptance has been performed.
