# RetroBooth v0.9.6 — 04 Receipt Print Test and Aspect Ratio

**NEW:** Admin → 04 / RECEIPT DESIGN → `Ticket screenshot aspect ratio` choose **4:3** (default) or **16:9**; preview and actual 384-dot thermal photo both update. `Test print PHOTO + QR` uses the current fields, with LIVE camera if available or an explicit SAMPLE if not. `Test print QR only` uses an invalid test QR; neither creates a guest link. Connect your Android secure SPP printer under Admin 08 first. Printed ASCII title/caption/footer are supported; visual layout/Chinese/logo from the screen designer is **not guaranteed** on paper. See `docs/RECEIPT_PRINT_V096_ZH.md`.

**Android:** GitHub Actions → RetroBooth - Build Android APK → Run workflow → install v0.9.6 TEST APK (versionCode 15). Use the same signing key and back up local videos before upgrade. Physical print and QR readability remain unverified until tested with your printer.

---

# RetroBooth v0.9.5 — 32-inch Android CRT frame update

- **01 Modern CRT** now has a proper graphite/silver 1990s television housing. The video screen, bezel, right control-panel width, outer padding and landscape responsive rules exactly follow the proven **02 Heritage TV** layout.
- Bottom-right **v0.9.5 / PREVIEW** now stays within the small landscape safe area. Tap **five times** to open Admin. As an alternative, hold **CH 03** at top-left for five seconds.
- **02 Heritage TV** unchanged in design. Recording, Camera-only/Mic-only controls, QR, and cloud are preserved from v0.9.3.
- Build a new Android TEST APK: **Actions > RetroBooth - Build Android APK > Run workflow**. Android versionCode **13**, same package ID and signing-key requirements.
- For style test: Admin > `01 / DISPLAY STYLES` > `01 / Modern CRT television` > Apply. Select 02 to return to original.
- Details and display validation: `docs/MODERN_CRT_V094.md`. Source only; APK/EXE not compiled in this package.

---

# RetroBooth v0.9.3 - Android independent camera + microphone inputs

**Android 13/12/other WebViews:** Admin > 02 / DEVICE CHECK > **1 / APPLY CAMERA - LIVE preview**. This deliberately requests VIDEO ONLY. You should see your live CRT image even when the mic fails. Then press **2 / APPLY MICROPHONE**. Audio request is independent; its failure does NOT close the camera. You may release only the microphone, or stop both. Guest Start is locked whenever exactly one input is working.

New Android native changes: `MODIFY_AUDIO_SETTINGS` install-time permission and protected permission-dialog WebView lifecycle. An actual Android test APK must be built, installed and checked; neither cause is certified fixed on target hardware.

**Build:** upload repo ROOT contents including hidden `.github`, commit, push `main`, run **RetroBooth - Build Android APK**. The Android artifact is expected to contain `RetroBooth-v0.9.5-Android-TEST.apk` IF GitHub's native build succeeds. Keep same signing key and export existing videos before updating. Windows EXE workflow remains separate.

Read `docs/ANDROID_MEDIA_V093.md` for full instructions. Existing cloud and QR print workflows are unchanged.

---

# v0.9.3 Android diagnostics update

Admin > Device Check > Test camera only > Test microphone only > Apply camera + microphone > Export full diagnostic JSON. See docs/ANDROID_DIAGNOSTICS.md.

# RetroBooth v0.9 - Independent APK and Windows EXE builds

One GitHub repository; **three independent manual Actions workflows**. No platform waits for the long Full Verification workflow before it starts compiling.

1. Copy the CONTENTS of this ZIP into the PRIVATE GitHub repository root (including the hidden `.github` folder). Do not add a nested `RetroBooth` folder.
2. Confirm `.github/workflows/build-android.yml`, `build-windows.yml` and `verify-all.yml` exist on the default branch. **Delete the old `.github/workflows/build-all.yml`** if you are applying a patch instead of the complete repo.
3. Commit and push the updated files to the default branch. Start a **new** workflow run (not Re-run of an old commit).
4. Open **Actions** and choose either `RetroBooth - Build Android APK` or `RetroBooth - Build Windows EXE`, then select **Run workflow**. Optional ARM64 is disabled by default.
5. For full browser, PHP and real-origin acceptance, separately run `RetroBooth - Full Verification`. A successful native build does not mean production/event acceptance.
6. Download program files from the successful run's **Artifacts**, not the logs or Evidence artifacts.

## Expected installable output names

- Android: `RetroBooth-v0.9.5-Android-TEST.apk` (requires Android job success).
- Windows x64 installer: `RetroBooth-0.9.5-alpha.1-Windows-x64-Setup.exe`.
- Windows x64 portable: `RetroBooth-0.9.5-alpha.1-Windows-x64-Portable.exe`.

No compiled APK/EXE is included in this source ZIP. Android keeps the existing secure-SPP QR-only pilot, not paper-validated. Windows native printing is not implemented. Keep stable `RETRO_TEST_*` signing secrets for upgrades, export important clips before uninstalling, and never upload private cloud keys or recordings to GitHub.

See `docs/SPLIT_WORKFLOWS_SETUP.md` for the complete steps. The bundled historical Word guide describes the older combined workflow; this document supersedes its GitHub Actions instructions only.

## v0.9.1 Android camera hotfix

Camera/mic input selection and separate tests are now in Admin > 02 / DEVICE CHECK. For the upgraded Android APK, run the independent `RetroBooth - Build Android APK` workflow; use the versionCode 10 TEST APK. See `docs/ANDROID_CAMERA_TROUBLESHOOTING.md`. Windows EXE workflow remains independent.
