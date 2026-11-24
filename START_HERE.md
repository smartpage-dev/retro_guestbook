# RetroBooth v0.9 - Independent APK and Windows EXE builds

One GitHub repository; **three independent manual Actions workflows**. No platform waits for the long Full Verification workflow before it starts compiling.

1. Copy the CONTENTS of this ZIP into the PRIVATE GitHub repository root (including the hidden `.github` folder). Do not add a nested `RetroBooth` folder.
2. Confirm `.github/workflows/build-android.yml`, `build-windows.yml` and `verify-all.yml` exist on the default branch. **Delete the old `.github/workflows/build-all.yml`** if you are applying a patch instead of the complete repo.
3. Commit and push the updated files to the default branch. Start a **new** workflow run (not Re-run of an old commit).
4. Open **Actions** and choose either `RetroBooth - Build Android APK` or `RetroBooth - Build Windows EXE`, then select **Run workflow**. Optional ARM64 is disabled by default.
5. For full browser, PHP and real-origin acceptance, separately run `RetroBooth - Full Verification`. A successful native build does not mean production/event acceptance.
6. Download program files from the successful run's **Artifacts**, not the logs or Evidence artifacts.

## Expected installable output names

- Android: `RetroBooth-v0.9-Android-TEST.apk` (requires Android job success).
- Windows x64 installer: `RetroBooth-0.9.0-alpha.1-Windows-x64-Setup.exe`.
- Windows x64 portable: `RetroBooth-0.9.0-alpha.1-Windows-x64-Portable.exe`.

No compiled APK/EXE is included in this source ZIP. Android keeps the existing secure-SPP QR-only pilot, not paper-validated. Windows native printing is not implemented. Keep stable `RETRO_TEST_*` signing secrets for upgrades, export important clips before uninstalling, and never upload private cloud keys or recordings to GitHub.

See `docs/SPLIT_WORKFLOWS_SETUP.md` for the complete steps. The bundled historical Word guide describes the older combined workflow; this document supersedes its GitHub Actions instructions only.

## v0.9.1 Android camera hotfix

Camera/mic input selection and separate tests are now in Admin > 02 / DEVICE CHECK. For the upgraded Android APK, run the independent `RetroBooth - Build Android APK` workflow; use the versionCode 10 TEST APK. See `docs/ANDROID_CAMERA_TROUBLESHOOTING.md`. Windows EXE workflow remains independent.
