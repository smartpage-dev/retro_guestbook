# v0.9.6 Receipt Print Patch — Merge into v0.9.5 Repository ROOT

This patch includes all modified + added files relative to the exact delivered `RetroBooth_v0.9.5_Android_Windows_GitHub_Ready.zip` baseline. It does NOT contain a complete repository.

1. Back up or copy your GitHub local working folder (particularly video data stored by the installed app).
2. Extract this ZIP into the **repository root**, next to `package.json`, preserving `.github/` and all nested paths; overwrite matching v0.9.5 source files. Do not create another `RetroBooth/` folder.
3. GitHub Desktop: check changed files, Commit, Push to main.
4. GitHub Actions → `RetroBooth - Build Android APK` → `Run workflow` on NEW commit. Download `RetroBooth-v0.9.6-Android-TEST.apk` only from a successful run; source ZIP is not an APK.
5. Android versionCode=15, app ID unchanged; use SAME signing key to update in place. DO NOT uninstall or clear app storage while recordings matter.
6. Pair/pin/connect printer via Admin 08; in Admin 04 choose 4:3/16:9 and use Test print PHOTO+QR or QR only. Native confirmation, paper verification and QR scan are required.

Read `docs/RECEIPT_PRINT_V096_ZH.md` for Cantonese setup, screenshot ratio, camera-off sample and known limitations. Full WYSIWYG/Chinese/logo physical printing is not included. No Android/real printer test is claimed.

Release: 0.9.6-alpha.1; compare against docs/V096_TEST_REPORT.md.
