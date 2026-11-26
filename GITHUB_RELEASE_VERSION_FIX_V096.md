# RetroBooth v0.9.6 - GitHub Version Alignment Fix

## What failed

The uploaded `logs_123923086822.zip` shows the Android build from GitHub commit `66d23bee3f2a053c9a65287179e5469537eb3191` stopped during `npm test`. Test 46 compared `package.json` with `desktop/package.json` and received `0.9.6-alpha.1` versus `0.9.5-alpha.1`. This indicates the repository's desktop package metadata had not been updated with the root package metadata. It was **not** an Android Java, camera, QR ticket or printer compilation failure. GitHub did not reach Gradle.

## Install the targeted patch (recommended)

1. Back up your existing local Git repository folder.
2. Unzip the PATCH into the **repository root** (alongside `package.json`). Merge the `desktop/`, `tools/`, `.github/` and `docs/` folders. The correct file is `desktop/package.json` (NOT the root `package.json`). Preserve any intentional local workflow customizations by reviewing the GitHub Desktop diff first.
3. From the repository root, run:

   ```sh
   python tools/check_release_versions.py
   npm run desktop:prepare
   npm test
   python tools/verify-repository.py
   ```

4. In GitHub Desktop, verify the changed files, Commit and Push to `main`.
5. In the GitHub **Code** tab, confirm both `package.json` and `desktop/package.json` say `0.9.6-alpha.1`, and the committed `VERSION.txt` and Android `versionName` agree.
6. Go to **Actions > RetroBooth - Build Android APK > Run workflow**. Start a **new** run rather than using Re-run on the old commit. Check that the new checkout SHA differs from `66d23bee3f2a053c9a65287179e5469537eb3191`.
7. The log should now include `PASS: all four release version declarations match.` ahead of npm tests.

## What's changed

- Restored `desktop/package.json` from the unmodified v0.9.6 complete-source archive.
- Added `tools/check_release_versions.py`, a standard-library-only early guard for root package, desktop package, `VERSION.txt`, and Android Gradle `versionName`.
- Added this guard before tests in the separate Android APK, Windows EXE, and Full Verification workflows.
- **No application feature, Android versionCode, Bluetooth printing, media processing, or desktop packaging logic changed.** The release remains `0.9.6-alpha.1` / Android versionCode 15.

## Validation carried out locally

- `npm run desktop:prepare`: passed.
- `npm test`: passed, including 46/46 desktop tests.
- `npm run test:native-core`: passed, 85/85 JVM/fake-transport tests.
- `python tools/verify-repository.py`: passed.
- Three workflow YAML files parsed successfully.
- Injecting a deliberately stale desktop package version causes the new version check to fail with a clear path and version mismatch.

A native Android APK has **not** been compiled in this environment. Physical Bluetooth printing and Android camera tests are unchanged and were not re-validated by this targeted patch.
