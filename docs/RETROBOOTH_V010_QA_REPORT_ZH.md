# RetroBooth v0.9.10-alpha.1 — USB Backup 專項 QA

- 原始碼基礎：使用者上傳嘅 v0.9.9 完整 GitHub ZIP。無重建／清除已存在的雲端 `config.php` 或 `data/`；亦冇修改活動 Cloud 權限協議。
- 新 Android 檔案：`NativeBackup.java`；主 Activity 只加入受同源主框架限制的 `RetroBackupNative` Bridge、Android SAF folder picker / lifecycle forwarding，唔要求 `MANAGE_EXTERNAL_STORAGE`。
- 新介面：`src/backup-admin.html`、`backup.css`、`backup-client.js`、`backup-flow.js`，保留 360p/24fps、TV 01–05、QRCode／打印功能。
- 新 Node unit：`tests/usb_backup.test.cjs` — 7 組測試：檔名／hash、32KiB Chunk Copy、相同檔去重、USB 中斷、錄影期間中止、位元組篡改、遺失開始傳輸回覆後安全 abort、超時回收（組別見原始碼）。
- 新 Chromium mock：`tests/browser_v010_usb_backup.py` — 27 項通過（Admin、未選 USB、**舊活動影片預設被排除**、手動確認活動開始時間、其他客戶片繼續排除、新片自動複製、原片未受影響、模擬原生 copy/verify、暫停、1920／1280／770 橫屏排版、普通 Browser disabled fallback）。
- 下游：舊版既有 npm、PHP Cloud、JVM 模擬、完整 Chromium Regression 另見本次測試 log。以上結果唔等於真正 Android USB 硬件驗收。

**仍需現場測試：** 用最新 Android TEST APK，連接真實 USB OTG 裝置並選擇子資料夾；錄製 3 段 WebM/MP4、確認 SHA、拔除 USB 時提示、重插再補備份、測試未完成檔清理、客戶 Windows/Mac 播放、USB 滿容量與寫入速度、完成後再驗證全部。報錯時原影片應仍在 Tape library。若 USB 文件供應者不支援 `DocumentsContract.renameDocument`，需要回報設備型號及測試結果以決定兼容處理，不應降級至未驗證檔案就顯示完成。

## 最終回歸結果（2026-11-28）

- **完整 Chromium Regression：32／32 組，1,096／1,096 項通過；0 failed。** 包括 TV 01–05 幾何、真實合成 Camera/Microphone、錄影保存、Cloud 私隱、QR Ticket／倒數截圖、Android Native Export 模擬、新 USB Event Backup Scope 等。各組數量見 `RETROBOOTH_V010_BROWSER_REGRESSION.json`。
- **USB Node unit：7／7 通過**（另驗證 Native begin 回覆遺失時會向同一 Transfer ID 發送 abort）；**USB Chromium mock：27／27 通過**（包含舊客戶片排除、由操作員確認舊片時間範圍、日後新片自動備份）。
- **PHP Cloud API：124／124 通過**；**Java 原生核心 JVM／假傳輸：85／85 通過**；**Unicode Ticket：9／9 通過**；Windows Desktop 原有單元測試 **46／46 通過**。Android APK metadata／repo Workflow Preflight、Release version declarations 在本機驗證通過。
- GitHub Source 會重新用 SHA-256 來源 ledger、雙 ZIP 解壓檢查及全新 Git commit/index 內容檢查確認。

**必須清楚區分：** Chromebook/Headless Chromium 合成瀏覽器、USB mock、JVM 假傳輸及 PHP 模擬測試，都唔等同 Android SAF USB 真機讀寫／實體打印／GitHub APK 正式編譯／Hostinger 上線驗收。**未安裝 Android SDK／Gradle，今次本機冇產出可安裝 APK**；要用 GitHub Actions Build TEST APK，並喺真實 32 吋 Android 以 USB OTG 做完整驗收。尤其要檢查外置儲存供應者嘅 `DocumentsContract.renameDocument`、拔除／插入、數百段影片複製速度、USB 滿容量、跨 Windows/Mac 播放、同現場電源穩定性。
