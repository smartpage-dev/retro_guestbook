# RetroBooth v0.9.4-alpha.1 — 01 Modern CRT / 02 Heritage TV

**Date:** 2026-11-25. **Source base:** complete RetroBooth v0.9.3 independent Android/Windows workflows GitHub-ready repository. **Android versionCode:** 13; same `studio.luce.retrobooth.preview` application ID.

## Purpose

On the user's 32-inch Android touch monitor, style **02 Heritage television** fits the screen but the older **01 Edge-to-edge CRT** touches the edges so closely that its bottom-right Version/Admin entry is partially cropped. Style 01 now uses the **identical shell geometry, bezel dimensions, picture area, panel width, cabinet inset, and responsive height breakpoints of working style 02**. Only surface finish and color change. This update is not a new camera pipeline or recording implementation.

## Visual design

- **01 Modern CRT television** (same persisted setting key `edge`): dark graphite and subtle gunmetal cabinet, satin brushed metallic inner bezel, gently curved CRT glass, understated 1990s mint-green channel indicator, metallic side controls, amber-red physical-style Start button, dark vent perforations. Existing **Colour Film CRT** image/recording effect stays selected by default, so the frame itself is never burned into guest video.
- **02 Heritage television** (key `heritage`): current walnut/brass, soft golden/mono screen style is retained. Its CSS property values remain unchanged; selectors now include both screen styles for layout sharing, with finish overrides scoped to 01.
- **Admin 5-tap access:** bottom-right `v0.9.4 / PREVIEW` has a bordered, contrasted, touchable hit area and extra inset from the bottom. Top-left `CH 03` still offers 5-second long press as fallback.
- Menu wording changed from `Edge-to-edge CRT` to `Modern CRT television`, but **stored style IDs `edge` and `heritage` have NOT changed**; existing saved events and look presets are compatible.

## Deploy to Android from GitHub

1. Unzip `RetroBooth_v0.9.4_Modern_CRT_PATCH.zip` **to the root of the existing complete v0.9.3 repository**. Merge folders and retain hidden `.github`. It is a patch, not a standalone repo.
2. In GitHub Desktop, check changed files, **Commit → Push to `main`**. Ensure the new commit appears in GitHub Code.
3. Start **Actions → RetroBooth - Build Android APK → Run workflow**. Android and Windows are separate workflows; no need to run Windows.
4. Download the **APK Artifacts** from the new successful run, specifically `RetroBooth-v0.9.4-Android-TEST.apk`, not `Evidence` or `UNSIGNED` developer artifacts.
5. Update without uninstalling if signed with same TEST key. **If Android reports a signature mismatch, export/save all local guest videos before taking any destructive step.** Never assume an old debug key remains stable.
6. Admin → Display Styles → choose `01 / Modern CRT television` → Apply → Booth. Tap bottom-right Version five times to confirm reopening Admin.

## Recommended on-device acceptance

- On the **actual 32-inch Android monitor**, use real resolution, Android System WebView and screen orientation used at events. With style 01 compare frame width, Start button, picture edges and speaker/control-panel width against style 02.
- Confirm **Version/Admin text is fully visible** with Android gesture/navigation bars active and again in fullscreen if available. Tap five times within 2.2 seconds between taps. Check top-left `CH 03` 5-second hold as a backup.
- Test both styles at rest, Camera-only Live Preview, Camera + Mic recording, timed auto return to Start, and QR delivery; ensure changing style does not clear camera/mic selection, duration or local videos.
- Record at least one true 10-second audio/video clip on real hardware and export a full diagnostic JSON if anything fails.

## Executed tests — software only

Desktop Chromium headless simulated CSS viewports of **1920×1080, 1366×768, 1280×720, 1024×600, 960×540, 800×360, 770×360**: compared exact shell, bezel, screen and control-panel dimensions, checked the Modern Version/Admin target stays visible, confirmed no horizontal overflow and actual five-tap navigation. The old v0.4 layout/appearance browser regression groups were updated for the intentional framed 01 design and rerun.

**Limitations:** This is a browser UI/layout test, not an actual Samsung/32-inch Android WebView/hardware validation. APK and Windows EXE require GitHub Actions native compilation; printer and cloud physical acceptance unchanged. No background recording, settings reset or external host deployment was performed.

## Rollback

Select **02 Heritage TV** in Admin to restore the same proven layout immediately. For code rollback, restore the v0.9.3 commit using GitHub Desktop/Git; if downgrading APK, Android normally refuses lower versionCode (12 vs 13), so export important local videos first and avoid uninstalling as a casual rollback.
