# RetroBooth v0.9.6 — GitHub Source / CI 全面審計（2026-11-26）

## 本次實際故障

- 來源：`logs_123928101906.zip` Android GitHub Actions job。
- Repository：`smartpage-dev/retro_guestbook`，`main`。
- Checkout commit：`78d47aeb2dc225ec8fc3cc1a1cf27f9e1b2366e7`。
- 失敗：`python: can't open file .../tools/check_release_versions.py: [Errno 2] No such file or directory`。
- Workflow 已跑完 Checkout、Node、Python、Java 安裝，**尚未開始 Android Gradle 編譯**。
- 先前多次缺 `src/desktop-admin.html`、`src/.htaccess`、`desktop:prepare` script 或桌面 package version，證明 Repository 經歷部分檔案/版本混用；**無法透過本次 log 直接檢查遠端 GitHub 其他檔案，但能確認此 SHA 缺少 checker**。

## 額外新發現及本次修正

1. 原本號稱完整的 v0.9.6 ZIP，其 `MANIFEST_SHA256.json` 對 3 個 GitHub Workflow 的 hash 已失效。現將整份 manifest **重新產生並驗證 ZIP 內每個檔案**。
2. `tools/native_build_info.py` 仍將 Android `versionCode` 寫成 **13**；App Gradle 已是 **15**。改成從 `android/app/build.gradle` 實際讀取，不再使用過期常數。
3. `START_HERE.md`、`docs/ANDROID_QUICK_START.md` 仍包含舊 APK 名稱、versionCode14 及部分舊階段文字。已加入最新版同步說明，改正目前 v0.9.6 版本及 Artifact 名稱，歷史 Workflow 指南標明並非最新版操作步驟。
4. 舊 `verify-repository.py` 只確認部分檔案存在；即使內容版本混用、檔案未 Stage，仍未必能及早發現。新增 `RELEASE_SOURCE_SHA256.json`，對 **190 個建置所需原始檔案**核對 SHA-256；`--require-git` 更會對 Git INDEX 內的 blob 逐一驗證，避免「本機已 Copy、但 Git 未真正 Commit」的假通過。
5. 新增 **`SYNC_TO_GITHUB.cmd`** 及 Node 跨平台同步工具；先核對來源 ZIP、目標 Repository、`main`、`origin`、乾淨 Working Tree，再只覆蓋受控原始檔、Stage，保留 `.git`、真正雲端 config、錄影；**不會自動 Commit/Push**。
6. 新增第四個 GitHub Workflow：**RetroBooth - Source Preflight (Fast)**，每次 Push `main` 自動執行；Android、Windows、Full Verification 三個原有手動 Workflow 仍各自獨立，並新增相同完整性檢查。
7. 原版 ZIP 混入大量舊 `qa/` 測試結果及 Android 可重建 assets，增加上傳混淆。本版只封裝真正 Git 建置來源、文件與測試程式，**不含生成截圖／APK／Gradle caches／node_modules／live configuration 或 Guest media**。
8. 完整 Browser Suite 的舊 `browser_v08.py` printer mock 仍假設 QR-only，無 `photoIncluded` 圖像確認，與 v0.9.6 Photo+QR contract 不符。已更新 **測試 fixture／assertions**（沒有修改真實 printing policy），核對預設未確認出紙保留 QR、及管理員另行明確接受的 fast return 是承擔未確認出紙風險，絕不算 `paperConfirmed`。

## 已實際通過

- 原始 v0.9.6 完整 ZIP CRC 檢查、版本一致性與 manifest 漏檔診斷。
- 新版完整 ZIP：所有檔案 CRC 與 SHA-256，必要檔案以 Release Ledger 校驗；ZIP 根目錄無多餘 `RetroBooth/` 包裝層。
- 4 份 GitHub Workflow YAML 解析、獨立觸發、GitHub Fast Preflight 會自動 on push；Gradle Action v6 與官方文件對照。
- `npm run desktop:prepare`、`npm test`（46 Desktop assertions）、`npm run test:native-core`（85 Java 核心 assertions）與 `python tools/verify-repository.py`。
- 私有 PHP Cloud API 測試（84 assertions）、所有 PHP 語法檢查。
- **完整 Chromium Browser Regression Suite：30 / 30 組、929 項測試通過，Exit code 0**。包括 01/02 版面、Camera/Mic 分開啟動、Privacy、Cloud、Printer Native 模擬、T−2 screenshot、Receipt Designer 4:3／16:9；全部屬合成／Mock 測試，唔係 Android 或實體打印機實測。
- Camera/Microphone 分開 Apply 瀏覽器模擬（34 checks）；Admin 04 Receipt Photo+QR 4:3 / 16:9 瀏覽器模擬（19 checks），由實際 Chromium 執行，打印 native bridge 使用 mock transport。
- **模擬部分損壞 GitHub Repo → 完整 Sync → Git Stage → Commit → Fresh Clone → SHA/Git Index 校驗 → Desktop/JVM 測試**通過。
- 正面驗證：`src/.htaccess`、`src/desktop-admin.html`、`tools/check_release_versions.py` 等以前經常漏嘅檔案在 Fresh Clone 中全部追蹤。
- 負面驗證：刪檔、不完整 Repo、工作檔案 hash 變更，以及 **本機檔案正確但 Git INDEX 仍係舊版本**，都可被正確攔截。
- Web/Hostinger/Local 三種預覽發佈 ZIP 已重建並通過 CRC；不含 live server data。
- 新舊 v0.9.6 的 55 個保留的 UI／Android Java／Cloud／Desktop 功能原始檔逐 byte 相同；功能無因本次 GitHub 審計而改動。
- 對 Windows `.cmd` 檔換成 CRLF 的模擬，SHA-256／Git Blob 檢查仍通過；Windows GitHub Desktop 內置 Git 的搜尋邏輯已新增，但沒有 Windows 實機驗證。

## 未宣稱完成的驗證

- **GitHub 遠端實際 Repository**：本次只收到 Actions Logs，無法直接變更/讀取完整私有 `main`；使用者需用同步工具 Commit/Push，並確認新 commit 的 Fast Source Preflight 成功。
- **Android APK 原生 Gradle/Android SDK build**：本地環境無 Android SDK；原生編譯、APK Signing 與 Android 實機仍須透過新 GitHub Actions 及 32-inch Android Monitor 驗證。
- **Windows EXE Installer/Portable**：本地環境沒有 Windows 原生 Electron packager 驗收；需跑獨立 Windows Workflow。
- **Bluetooth 實體熱敏打印**：JVM 模擬輸出不等於已出紙或 QR 可掃；實體 58mm 384-dot ESC/POS 對應機型仍需驗證。
- **真實 Android WebView / Windows Electron 的瀏覽器行為**：已完成整套 Chromium 合成／Mock Browser 回歸，但無法以此取代 Android 真機或 Windows 原生打包的驗收。
- **Hostinger Live／相機／咪持續性**：本次係 Source／Build CI 審計，未改動現場硬件或真正雲端部署。

## 建議唯一 GitHub 更新方式

請睇 `docs/ONE_TIME_GITHUB_SOURCE_SYNC_ZH.md`，解壓 **單一 Canonical FULL ROOT ZIP 到 Repository 之外** → 雙擊 `SYNC_TO_GITHUB.cmd` → 選擇 GitHub Desktop Clone 目錄 → Dry Run → 輸入 `APPLY` → 檢查 Staged Changes → Commit + Push `main` → 自動 Source Preflight 綠燈 → 手動 Android APK。

**唔好再混用之前嘅 Root PackageJSON PATCH、Version Alignment PATCH、Preflight Missing Checker PATCH。佢哋係舊版本嘅局部修復，唔係本次 Canonical Release。**
