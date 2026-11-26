# RetroBooth v0.9.6 — GitHub 全面修復及一次過同步（Android/Windows）

## 為甚麼反覆 Build 失敗？

最新 Android Actions commit `78d47aeb2dc225ec8fc3cc1a1cf27f9e1b2366e7` 喺 `python tools/check_release_versions.py` 中止：
`No such file or directory`。完整版本其實有呢個檔案。之前又出現 `src/.htaccess`、`src/desktop-admin.html`、根目錄 `package.json`、`desktop/package.json` 等不同缺漏或版本不一致，反映現有 `main` 分支混合多個 ZIP/PATCH，未真正同步成同一份完整版本。

**今次唔再逐檔補。只使用一份完整原始碼 ZIP，附有 190 個必要檔案 SHA-256 + Git 追蹤檢查，以及安全同步工具。**

## 開始前

- 確認你使用 GitHub Desktop，Repository 係 `smartpage-dev/retro_guestbook`，分支為 `main`。
- Node.js 22 或更新版本，及 Git（Git for Windows 或 GitHub Desktop 內置 Git；同步工具會嘗試自動尋找）。Windows 原有 Node 25 亦符合。
- **先備份本地 Repository，特別係自行改過嘅檔案。** 如果 GitHub Desktop 有尚未 Commit 嘅改動，先審閱、Commit 或備份；工具遇到 Dirty Working Tree 會拒絕覆蓋。
- 已安裝 Android APK 嘅**本機影片與設定唔會因 GitHub 原始碼同步而被刪除**；但升級 APK 時請繼續使用同一簽署金鑰，唔好隨便卸載或清除 App 資料。
- **唔好上傳 ZIP 作為 GitHub 單一檔案，亦唔好只將 ZIP 裏面嘅 `tools` 或 `.github` 局部複製。**

## 推薦方法：一次過完整 Sync

1. 下載 `RetroBooth_v0.9.6_Canonical_Full_GitHub_Root.zip`，解壓到**與 GitHub Repository 不同嘅資料夾**，例如 `Downloads\\RetroBooth_v096_Canonical`。解壓後直接見到 `.github`、`android`、`desktop`、`src`、`tools`、`package.json`、`SYNC_TO_GITHUB.cmd`，**唔應該多一層 `RetroBooth/`**。
2. GitHub Desktop 先切到 `main`，按 **Fetch origin**，若有更新先按 **Pull origin**，等本地分支對齊遠端；確認冇未 Commit 或未 Push 嘅改動。用 **Repository → Show in Explorer** 查出 Clone 路徑（例如 `C:\\Users\\<user>\\Documents\\GitHub\\retro_guestbook`）。
3. 喺解壓咗嘅完整版本資料夾，**雙擊 `SYNC_TO_GITHUB.cmd`**。
4. 貼上 Clone 路徑。工具先做 Dry Run，顯示 Repository Origin、分支、檔案差異及完整性。若符合條件，再輸入 `APPLY` 確認。
5. 工具會只複製受控版本嘅必要原始碼、隱藏 `.github` 同 `.htaccess`，並將受控檔案 **Stage 到 Git index**；如舊 `build-all.yml` 仍存在，會一併移除。唔會碰 `.git`、雲端真正 config.php、影片資料、GitHub Secrets；**亦唔會自行 Commit 或 Push**。
6. 如果見到 `PASS: complete v0.9.6 release, 190 SHA-256-checked source files, all tracked by Git.`，打開 GitHub Desktop，檢查 staged changes，確認包含 `tools/check_release_versions.py`、`tools/check-release-integrity.mjs` 同 `.github/workflows/source-preflight.yml`，然後 Commit：`Sync complete RetroBooth v0.9.6 source`，再按 **Push origin**。
7. 到 GitHub Code 頁再次確認 `main` 分支有 `tools/check_release_versions.py`。今次更新亦會自動觸發 **Actions → RetroBooth - Source Preflight (Fast)**。該 Workflow 綠燈後，先按 **RetroBooth - Build Android APK → Run workflow**。Windows EXE 仍可獨立執行。

## 手動驗證命令

喺本地 Repository 根目錄：

```cmd
node tools/check-release-integrity.mjs --require-git
python tools/check_release_versions.py
npm run desktop:prepare
npm test
```

**第一條一定要先 PASS**，任何 `MISSING FILE`、`HASH MISMATCH`、`NOT COMMITTED/STAGED IN GIT` 都唔好再開新 Android Build。Python/Java 非必要先可略過本地測試，但 GitHub Fast Preflight 會執行。

## 四個 Workflow

- **RetroBooth - Source Preflight (Fast)**：每次 Push `main` 自動執行，完整來源及快速測試。
- **RetroBooth - Build Android APK**：只 Build Android，手動啟動。
- **RetroBooth - Build Windows EXE**：只 Build Windows，手動啟動。
- **RetroBooth - Full Verification**：完整 Browser／PHP／Cloud 回歸，手動啟動。

## 仍待驗證

本次來源包由本地程式測試、PHP API 與本地 Git Clone 模擬檢查，不等於已用 Android SDK 編譯 APK、Windows Electron 真機打包或實體 SPP Printer 出紙。GH Build 仍需要實際執行；簽署金鑰可能影響 APK 能否覆蓋安裝。正式活動前仍需在 32-inch Android 上測錄影、Screenshot T−2、實體 QR 掃碼及私有雲下載。

## 如果 GitHub Sync 顯示錯誤

- `Repository has local changes`：先到 GitHub Desktop 檢查本地改動；工具未改檔案。
- `Push rejected / branch behind origin`：停止 Build；先備份及整理本地改動，喺 GitHub Desktop Fetch / Pull 最新 `main`，再重新 Sync。工具唔會自行做遠端合併或 Force Push。
- `Origin does not match`：你揀錯 clone，唔好強行覆蓋。
- `HASH MISMATCH`：解壓內容不完整、用錯 ZIP、或使用過局部 PATCH；請重新解壓完整版本。
- `NOT COMMITTED/STAGED IN GIT`：有漏 Stage 嘅原始碼；同步工具應該會直接處理。提交前唔好手動取消選取呢啲必要檔案。
- GitHub Actions 仍顯示舊 SHA：確認 Push 成功，**必須對新 commit 開新 Run**，唔係對舊 Run 按 Re-run。

**套件精簡原則：** 這份 FULL ROOT ZIP 包含所有 Build 所需原始碼、三平台 Workflow、雲端 Alpha 源碼同文件，但不包括 `qa/` 的測試截圖、`android/app/src/main/assets/www/` 生成檔、`node_modules`、Gradle cache、Live credentials 或實際錄影。GitHub Actions 會按 `npm run desktop:prepare` / `android:assets` 重建 Android Web 資源。唔需要亦唔應該將舊 `qa/` 日誌合併返嚟。
