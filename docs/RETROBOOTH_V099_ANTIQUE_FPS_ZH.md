# RetroBooth v0.9.9-alpha.1 — 古董電視外殼／360p 24 FPS 更新指南

日期：2026-11-27 · Android `versionCode 18` · 完整 GitHub source ZIP + Hostinger PHP code-only ZIP

## 本次改動

- **TV 01 Modern CRT、TV 02 Heritage TV 保持原有視覺。**
- **TV 03 — Mustard Portable TV**：參考 1970s 黃色手提 CRT 電視，重新設計芥末黃色塑膠曲面、立體提手、單桿天線、鉚釘、黑色機械調台區及 CRT 邊框。
- **TV 04 — Rusted Industrial TV**：參考殘舊的 1950s 盒裝電視，採不對稱三欄機身（左側獨立調台旋鈕＋喇叭、中間玻璃 CRT、右側時鐘／錄影控制板），加入原創程序化鏽蝕紋理、暗金屬凹陷和磨損邊。
- **TV 05 — Walnut Console TV**：參考 1960s 胡桃木電視傢俬，木紋外殼、銀色內框、金屬調台鈕、右側米色控制板、細長木腳和 V 字天線。
- 三款是 **HTML／CSS 互動機身**，不是以你提供的照片作覆蓋圖；右側真正的 Start、倒數、錄影及 Admin 入口都保留。參考圖沒有被嵌入產品，亦沒有使用任何水印圖片。
- **預設錄影畫布高度 360 pixels（360p）＋目標 FPS 24**，取代先前 720p/Auto 的預設。圖像的闊度會依 CRT 形狀及有效畫面比例動態決定，未必等於標準 640×360。
- Admin → **01 / EVENT & CAPTURE → Guest TV display text / Android render performance**：FPS 可選 8、10、12、15、18、20、24（預設）、30、Auto；影片高度選 360p（預設）、540p、720p。相機輸入按所選解像度要求 640×360、960×540 或 1280×720，而前端畫布渲染速率與 `canvas.captureStream(fps)` 請求一致；選項是一個 **目標而非效能保證**，手機／WebView 實際渲染、相機來源及影片編碼可能達不到 24fps。
- 針對 60Hz 畫面改進畫面排程，不再單靠逐幀時間差限速而將 24fps 不必要地下調接近 20fps；重開／背景暫停不會一次追畫過量幀。
- 首次啟動此版時，若舊設備剛好仍是 **Auto + 720p 舊版預設組合**，會升級至 24 + 360。已使用其他 FPS 或解像度組合的設備保持自訂值。

## Android 更新（GitHub Desktop）

1. **先備份 Android 本地影片**。如裝置已有 RetroBooth，必須使用 **相同 APK 簽署身份**；不要卸載舊版或清除 App 資料，否則可能遺失本機片段。版本號 `0.9.9-alpha.1`／`versionCode 18`，Android applicationId 不變。
2. 解壓完整 **`RetroBooth_v0.9.9_Android_Windows_GitHub_Ready.zip`**，ZIP 要放在 GitHub clone 資料夾**以外**。
3. 先 GitHub Desktop **Fetch/Pull**，執行解壓後的 `SYNC_TO_GITHUB.cmd` 指向本機 clone。**核對輸出有 PASS**；要把 `.github`、新增 CSS、Android Gradle、兩份 SHA 檔和測試全部提交，不可逐小 patch 混合。
4. GitHub Desktop 對**同一 branch** Commit + Push。檢查 `RetroBooth - Source Preflight (Fast)` 綠燈，再手動執行 `RetroBooth - Build Android APK`，branch 選最新 commit。不要按舊失敗 run 的 Re-run。
5. GitHub Actions 成功後，到 Run → Artifacts 下載 **Android TEST APK**。**此來源 ZIP 不含已編譯的 APK／EXE。** Windows EXE 可另外執行獨立 Workflow。
6. 開啟 Admin → **TV DISPLAY STYLES** 區塊選 TV 03、04 或 05；到 Admin → **01 / EVENT & CAPTURE** 裡面的進階設定確認 360p／24 FPS，再按 Save。Admin → 02 分別 **Apply Camera** 及 **Apply Microphone**。錄影前可輸出 Admin Full Diagnostic JSON，比對 observed FPS。建議用實際 32 吋 Android 做 10、30、60 秒測試及 QR 下載測試。

## Hostinger PHP Cloud 更新（現有網站，不重建活動）

1. **必須備份**網站 `public_html/`、既有網站根目錄以外的 `retrobooth_private/config.php`、`retrobooth_private/data/`（裡面有活動、權限、影片）及需要保留的媒體。
2. 解壓 **`RetroBooth_v0.9.9_Hostinger_PHP_Cloud_Update.zip`**。`public_html/` 與原來網站同名路徑**合併 code-only 檔**，包含 `.htaccess` 和 `booth/index.html`；僅覆蓋 PHP 私有程式 `retrobooth_private/app/Cloud.php`、`tools/cleanup.php`、`.htaccess`。絕對不能刪除、覆寫或重新建立 `retrobooth_private/config.php`、`data/`。
3. 保留舊 Event IDs、device key、私人播放授權；不用因外觀更新而新建活動或重新配對。Camera FPS/Resolution **只由 Android 本機控制**，不由雲端 Event Master 改寫。
4. 如果 Android 已配對 Cloud Event Master，請在 **Cloud Admin → Event Master → TV body** 選擇 03／04／05 並 Save；然後在 Android **Idle** 時 `Sync event settings now`。雲端 Event Master 的 TV body 可覆蓋 Android 本地外觀，避免兩邊不同步。**FPS／解像度則始終只在 Android 本機 Admin 控制**。
5. 檢查 `/api/health`、`/admin/`、Guest 分享網址（私人播放、下載）、Big-screen 與 Guest Delete 預設權限。

## 功能和安全邊界

- 這份更新從 v0.9.8 的程式碼增量建立；QRCode、Guest/Slideshow、Event Master、Bluetooth Ticket、local-first 影片流程原則上保持原樣。**程式回歸／Chrome 模擬測試不等於現場整合驗收**。
- 實際相機 sensor FPS、Canvas compositor FPS、錄製檔案的平均 / 逐幀 encoded FPS 可能不同。建議錄 10 秒＋60 秒在 Android 上下載 WebM，使用 MediaInfo 或 ffprobe 驗證輸出尺寸、真正 encoded FPS、聲音同步及流暢程度。若達不到 24fps，可於 Admin 降至 20、18、15、12 等，並避免高解像度及過重濾鏡。
- 既有 QR Ticket Print 為 Android 58mm Bluetooth Classic Secure SPP／ESC/POS 384-dot **直向實體輸出**；瀏覽器 Landscape 票面**非實體橫向列印**。中文 bitmap、影像、裁紙及實際打印成功仍須按打印機型號實機測試；`sent_unconfirmed` 絕非紙張成功證明。保留螢幕 QR 後備，未知結果勿自動重送。
- 雲端部署、新 Android APK 編譯、硬件端 24fps、實際藍牙打印**未在本環境驗證**。不要將密鑰、live `config.php`、媒體檔放上 GitHub 或 `public_html/` 私密位置。
