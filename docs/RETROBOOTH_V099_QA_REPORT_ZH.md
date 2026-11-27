# RetroBooth v0.9.9-alpha.1 — 源碼及模擬測試報告

測試日期：2026-11-27 · 基準：使用者上傳的 v0.9.8 Full GitHub Source 與 Hostinger PHP code-only ZIP。

## 已驗證

- 五款機身 CSS/DOM UI：TV 01/02 舊樣保持、TV 03/04/05 各自獨立幾何／材質組件。v0.9.9 專項 Chromium browser 測試 139 項通過（1920×1080、1280×720、960×540、770×360、390×844），檢查可視範圍、Start、Admin 5-tap、特有部件、初始 360p/24fps 設定，以及舊 Auto/720p 預設遷移／自訂設定保留。
- FPS 排程使用虛擬 60Hz requestAnimationFrame 時鐘：8、12、20、24、30 FPS 分別以 8、12、20、24、30 幀達成各自一秒理論目標；**不是硬件測試，更不代表實際 WebM 的 encoded FPS**。
- 以合成 Camera mock 觸發實際 `getUserMedia()` 請求驗證 360p→640×360、540p→960×540、720p→1280×720，三者均可要求已選的 20 FPS；避免 540p 錯誤要求 720p sensor 畫面。
- 真正 Chromium MediaRecorder 程式路徑（合成 Camera 影像及 330Hz 合成音訊，**不是實體硬件**）成功錄製兩段約 10 秒、可讀取／重播的 536×360 像素 MP4（VP9）檔；本機 `ffprobe` 顯示平均約 **16.5 fps（Film）／18.4 fps（Heritage）**。此時採 headless browser／軟件合成負載，證明 **24fps 只是一個請求及目標，而非已達標結果**；必須在用戶真正的 Android 裝置測試。
- 本地 Node／JS 核心設定測試，確認 360p＋24fps 預設、低 FPS 選項白名單、非法 FPS fallback、安全儲存與現有業務邏輯（依 `npm test`）。
- PHP Cloud API 模擬 124 項通過：私人票據、Guest 權限、Event 關閉、刪除 tombstone、撤銷和清理保護；未部署至實際 Hostinger。
- Android JVM/native 核心 85 項 + Unicode Ticket 9 項通過：測試 fake SPP transport、狀態和 bounded 384-dot raster；**不能代替真藍牙打印機**。
- ZIP manifest／Source SHA-256 完整性；在新建並已 commit 的乾淨 Git 測試 repository 執行 `check-release-integrity.mjs --require-git` 通過。Hostinger 包只含 code，不帶 live config、private data、影片、密鑰。
- 舊版瀏覽器回歸 30 組首輪執行：**29 組成功（918 項斷言）**；其中 `browser_v05-pixels` 沿用舊版固定 720p 取像素座標，對新的 360p 默認畫面誤判失敗。測試修正成按實際畫布高度取樣後，獨立重新執行 **12/12 PASS**；新 v0.9.9 專項 139 項亦獨立通過。**首輪整套 run_suite 結果仍標記有一組失敗，未聲稱整套重跑全綠。** 後續 GitHub 完整 Run 可再進行最新來源的全套執行。

## 未完成／不能宣稱已證實

- 沒有在實際 32 吋 Android 顯示器、WebView、硬件攝影機／咪高峰量度 FPS、畫面掉幀、影片聲畫同步、熱量或輸出檔案 Metadata。
- 未在本環境完成 Android APK 或 Windows EXE 編譯與實機安裝。GitHub Actions 的成功／失敗需由新 commit 的 Run 決定。穩定更新需保留相同 TEST signing key，防止卸載及遺失本地影片。
- 本環境對 localhost 真來源 Chromium 頁面施加網絡限制；網絡 origin 整合不等於通過。頁面模擬採 `page.set_content()`，無法代表相機授權的 Android 真實 HTTPS origin。
- 未部署／修改真 Hostinger；不包含 live `config.php`、Event `data/`、影片或客人 credentials。
- 實體 58mm ESC/POS 圖像、中文 bitmap、QR 掃描、票紙出紙狀態未按打印機實機驗收；無 cutter、無打印成功的紙張確認。Windows 本機打印服務未新增。

## 事件現場最小驗收

Android 安裝新 TEST APK → 登入 Admin 01 檢查 360p/24 → TV 03、04、05 各拍 10 秒 → Admin 02 分別申請 Camera/Mic → 用真客人 QR 打開私人頁面下載 WebM，用 MediaInfo/ffprobe 檢查高度與實際 average/frame-level FPS、音訊同步 → 若達不到 24，Admin 降至 20／18／15 直至穩定 → 測 30／60 秒 → 依打印機實際型號做 QR-only、photo+QR 票並手動掃描確認 → 用另一部手機檢查 private slideshow 和 Guest Delete／consent 只在授權開啟時顯示。
