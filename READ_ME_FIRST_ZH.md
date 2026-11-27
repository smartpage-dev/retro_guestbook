# RetroBooth v0.9.7 Android APK Verify Fix — GitHub Desktop 操作指南

## 最新 Build Log 真正結果（2026-11-27）

- Branch：`replace/retro_guestbook2`
- Git Commit：`a16e91876bbe940350ca33d10c8d11bb0c7df255`
- Source Integrity、預檢、Java 核心測試全部通過。
- Android Gradle：**BUILD SUCCESSFUL in 55s**，執行 95 項 Gradle tasks。
- `apksigner verify` 已經運行到下一個步驟，實際 `aapt dump badging` 顯示：
  - Application ID：`studio.luce.retrobooth.preview`
  - versionCode：**16**
  - versionName：`0.9.7-alpha.1`
- 最後驗證程式仍然寫死 `grep "versionCode='15'"`，導致 Exit Code 1。呢個係 Workflow 驗證錯誤，唔係 APK 編譯錯誤。
- 因為未去到 Artifact 上傳，今次失敗 Run **冇安裝用 APK 下載連結**。

## 修復方式 A（建議）：只上傳 PATCH

1. 先備份 GitHub Desktop 本地 `retro_guestbook` Repository；保留你原有 Cloud 資料同錄影。
2. 下載 `RetroBooth_v0.9.7_Android_APK_Verify_Fix_PATCH.zip`，**解壓到 Repository 以外**嘅資料夾。
3. 喺 GitHub Desktop 確認目前 Branch 係 `replace/retro_guestbook2`（如你已 Merge 到 `main`，就喺 `main` 做）。按 `Repository > Show in Explorer` 打開 Repository。
4. 將 PATCH 內嘅 **八個原始檔案**複製入 Repository 對應路徑。Windows Explorer 要顯示隱藏項目，確保 `.github/workflows/` 真係覆蓋；**唔好將 ZIP 或整個補丁資料夾放入 Repository**。
5. 八個路徑：
   - `.github/workflows/build-android.yml`
   - `.github/workflows/source-preflight.yml`
   - `tools/verify_apk_badging.py`（新增）
   - `tests/test_apk_metadata.py`（新增）
   - `tools/verify-repository.py`
   - `tools/check-release-integrity.mjs`
   - `RELEASE_SOURCE_SHA256.json`
   - `MANIFEST_SHA256.json`
6. 喺 GitHub Desktop 確認呢八個檔案都出現喺 Changes，然後 Commit，例如 `Fix Android v0.9.7 APK metadata verification`，再按 **Push origin**。
7. 去 GitHub → **Actions → RetroBooth - Build Android APK → Run workflow**，揀你剛 Push 嘅 **`replace/retro_guestbook2`** 分支，開始全新 Run。**唔好 Re-run 舊失敗 Run**。
8. 新 Run 成功後到 **Artifacts** 下載 `RetroBooth-Android-APK-v0.9.7-...`，解壓先係可以安裝嘅 `RetroBooth-v0.9.7-Android-TEST.apk`。

## 修復方式 B：完整原始碼

如果你嘅 Repository 已經缺少其他檔案，可以用 `RetroBooth_v0.9.7_Android_APK_Verify_Fix_FULL_REPO.zip`。但內置 `SYNC_TO_GITHUB.cmd` 係設計用於 **main** 分支、乾淨工作目錄，唔可以直接喺目前 `replace/retro_guestbook2` 執行。若仍喺該 Branch，建議只使用上述 PATCH，唔好換 Branch、Discard 或覆蓋本地未提交改動。

## 改善內容

- 唔再將 `versionCode` 寫死 15 或 16；使用 Gradle `applicationId`、`versionCode`、`versionName` 同真實簽署 APK 嘅 `aapt` metadata 作嚴格核對。
- 保留 `apksigner verify`，唔會為咗過 Build 而跳過簽名或安全檢查。
- 新增七項 regression tests，包含故意錯版、錯 Package ID、缺 metadata、下一版本自動驗證。
- 來源完整性清單、Git staged/committed SHA-256 清單一併更新。
- **無改動** Android Camera／Mic、TV 框／特效、Hostinger Cloud、QR Ticket Printer 或 Guest 網頁程式。

## Test 結果及限制

- 原始 GitHub Log：Gradle 編譯、Android Lint 全部通過。
- 修復版本地：7/7 APK Metadata Regression、46/46 Desktop、85/85 Java Print Core 通過；199 個 Source SHA-256 + Git Index／Fresh Clone 通過。
- 以 **今次真實 Log 中的 APK metadata** 測試新版驗證器：通過。
- 修復後嘅 **GitHub Artifact Upload** 尚未執行，唔可以將本地測試當成完整新 Run 成功。

**重要簽署提醒：** Log 顯示使用臨時 Debug Keystore，唔同 Build 可能有唔同簽名；更新舊 APK 時可能被 Android 拒絕。務必先匯出本地錄影；未設固定 `RETRO_TEST_*` secrets 前唔好卸載舊 App／Clear Storage。
