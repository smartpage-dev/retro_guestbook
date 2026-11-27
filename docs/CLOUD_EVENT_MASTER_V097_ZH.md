# RetroBooth v0.9.7 — Hostinger Cloud Event Master + Android 同步／私隱 Slideshow

版本：0.9.7-alpha.1，27 Nov 2026；**Source Candidate**，尚未在你的 Hostinger 及 32 吋 Android 實機完成 v0.9.7 驗收。現有 v0.9.6 影片 / Cloud 私人資料必須保留。

## 1. 新工作流程

**Cloud Admin 建立 Event → 設定 Event Settings → 設備 Bundle 配對 Android APK → Android 閒置時同步 → 來賓錄影 → Android 本機保存 + HTTPS 私人上傳 → Cloud Ready / Play / Download / Share → Guests 私人 QR。**

- Cloud 係 **Event Master**：活動名稱、日期、錄影時長 10/30/60 秒、倒數、五款 TV Frame、八款 Screen Effect、Ticket 相片比例 4:3/16:9、T− 擷取秒數、QR 顯示時長、Receipt Caption/Footer、Local Show Hold、Big-screen/Auto-approve/Guest Delete 等權限。
- Android 係 **Hardware + Capture Master**：Camera/Mic 選擇、Bluetooth Printer SPP 配對／診斷、檔案拍攝及本機影片保存。Cloud 唔會更改相機和實體打印機連接。
- Cloud 設定每次儲存提升 revision；Android 空閒時每約 15 秒檢查（亦可 Admin 07 手動 Sync now）。**錄影進行中唔會強制切換配置**。斷網時 Android 用最後已同步設定。
- 若 Android Admin 仍顯示 Demo／Cloud 未連接，不會自動改成 Cloud Event。要確認設備 Bundle 屬於正確活動。

## 2. 正式 Hostinger PHP Cloud 安全升級（最重要）

網址示例：`https://parallel-mediumaquamarine-crocodile-69.hostingersite.com`；實際部署可用你自己嘅網域。

1. 在 Hostinger **備份**現有 `public_html`、`retrobooth_private/config.php`、`retrobooth_private/data/` 和影片。保存獨立離線副本。
2. `public_html/` 同 `retrobooth_private/` 應該喺相同網站根目錄平排放置。**私人目錄永遠唔可以放喺 public_html 裏面。**
3. 將獨立 `RetroBooth_v0.9.7_Hostinger_PHP_Cloud_Update.zip` 解壓 **喺電腦**。將 `public_html/` 入面嘅內容上傳／覆蓋到 Hostinger 已有 `public_html/`，包括 `.htaccess`、`admin`、`guest`、`show`、`booth` 同 `/assets` 等頁面。
4. 將壓縮包 `retrobooth_private/app/Cloud.php` 上傳到現有 `retrobooth_private/app/Cloud.php`，如有其他 private `tools/` 同樣可以更新，但 **唔好刪除／覆蓋任何實際 `config.php`、`data/`、影片、金鑰或日誌**。
5. 繼續使用原有 Hostinger PHP 8.2+、HTTPS、Cron cleanup。**無需建立 Node.js Web App、無需新增 Node environment variables，亦唔需要重置 Admin Key。**
6. 測 `https://你的網域/api/health`，再開 `/admin/` 用原本 Cloud Admin Key 登入。Cloud API 內部 build 字串若仍顯示 `0.7.0-alpha.1` 係沿用 v0.7 Cloud API 版本識別，唔代表新 v0.9.7 網頁冇上傳。
7. 如雲端出現 500，**先還原備份 Cloud.php 和 public assets，不要動 data 目錄**，分析 Hostinger PHP error log。不要公開 `config.php` 或 Admin Key。

## 3. 完整 GitHub Source → Android v0.9.7 APK

1. 用單一 `RetroBooth_v0.9.7_Canonical_Full_GitHub_Root.zip`，唔好混合舊 PATCH。GitHub Desktop：Fetch／Pull 最新 `main`，先備份有改動嘅工作目錄。
2. 解壓全套源碼到**獨立**資料夾，Windows 用 `SYNC_TO_GITHUB.cmd` 同步至本地 `retro_guestbook` Clone；檢查所有新增、修改、刪除文件，再 Stage → Commit → Push。唔好只手動上傳半套資料夾。
3. 喺 GitHub Actions 確認 `RetroBooth - Source Preflight (Fast)` 綠燈，再手動 `RetroBooth - Build Android APK`，分支 `main`，**全新 Run**（不要 re-run 舊 Commit）。Windows EXE 可另外獨立建置。
4. 下載 Artifacts 內 `RetroBooth-v0.9.7-Android-TEST.apk`，在 32 吋 Android 安裝。同一 App ID，`versionCode=16`；**必須沿用相同簽署 Key** 才能原位更新。新舊簽名唔同要先匯出全部本機錄影，不能清除 App Storage。
5. Android Admin 02 先分別 Apply Camera、Apply Microphone，確認正式 10 秒音訊錄影；Admin 07 配對／重連現有 Cloud device bundle，按 Sync now 或等待 Idle 同步。檢查 Title、Frame、Effect、Duration、Ticket 設定都與 Cloud 一致。

## 4. Cloud Admin 配置順序

1. 登入 `/admin/`，在 **01 / CLOUD EVENT MASTER** 選一個活動；如冇，先 Create event。相同有效 Event 名稱會防重覆；上版已存在的同名活動 **唔會自動刪除／合併**，下拉選單會標示 ID 和建立日期。務必按 device 所屬活動選正確 Event。
2. 在 **02 / EVENT SETTINGS** 調整錄影長度、倒數、五款機殼、八款畫面效果、QR Timer、Ticket 相片比例和截圖時間。按 `Save & sync event settings`，確認 Saved 同 Revision 已加 1。
3. 在 **03 / EVENT PERMISSIONS** 設 Big-screen、Auto-approve（需 Guest consent）、Guest Delete，全部預設 OFF。按鈕有明顯 ON/OFF、Working / Saved / Failed 回饋，防止連按重覆請求。
4. 如要 Big-screen，先開 `Big-screen display`；需要時開 `Auto-approve after guest consent`。按 `Generate / rotate private show link` 取得**私人** Slideshow URL，保存到密碼管理器。Rotate 會令之前 Show Link 失效。
5. 在 **04 / RECORDINGS** 預設只睇 `Ready recordings`，可切換 All 檢查 Reserved/Uploading，唔好將預約 QR 視為完成影片。Ready Clip 有受權限保護 Screenshot Thumbnail、Play、Download、Share view-only、Reprint QR Ticket（Browser Print）、Show Approval / Revoke、Delete 再確認。
6. Share／Reprint 會發一條**短期、只可觀看/下載**嘅臨時 Guest URL；**唔係原客人可控制删除/Show 同意嘅 Owner QR**。已知無 Cloud Screenshot 嘅舊片可印 QR-only；有 Thumbnail 新片就會加載相片。Cloud Browser 打印會開本機 Print Dialog，**不會直接驅動 Android Bluetooth SPP Ticket Printer**。

## 5. Big-screen approval vs 私人 Guest viewing

- **Guest 私人 QR 係交付自己錄影**，與 Approve for show **完全分開**。Cloud `ready` 後客人可播放／下載，唔需要 Staff Approve。
- **Approve for show** = 工作人員批准「用於私人活動 Slideshow」。只有 Event Big-screen ON + Clip Ready + 客人明確允許 + Staff Approved（或 ON 自動審批已得到客人同意）先可列入播放清單。未同意絕不自動播放，預設全部私人。
- Big-screen OFF 時，Guest Page **唔顯示允許公開播放**一段；Guest Delete OFF 時**唔顯示刪除錄影**，後端亦檢查權限，並非純 UI 隱藏。
- Slideshow 是需要秘密 URL 的活動播放頁。**目前沒有對外公開 Event Album；Cloud Admin Gallery 只給工作人員使用**。若將來要 Album，應另作獨立功能與存取審批。
- 客戶 Guest Page `Refresh / Reconnect playback` = 當影片 Pending 或播放憑證過期時重新取可播放授權，**唔會重新錄影／唔會上傳檔案**。

## 6. 其他 UI／安全細節

- 五款 TV：01 Modern CRT（石墨／銀灰），02 Heritage TV（木紋／金邊），03 Space Age Ivory（象牙白），04 Studio Broadcast（深色專業監視器），05 Y2K Bubble（柔和圓潤）。新四種獨立 Screen Effect：VHS、Sepia Archive、35mm Cinema、Night Vision，保留原本 4 種預設/Follow。
- Upload Clip 後 Android 會儘量將該 Clip 之前選定倒數時間嘅 Ticket JPEG 上傳到 Cloud（**影片成功 Verified 之後**）。受限於資料大小、舊版 APK、離線等情況，舊片可能冇縮圖；Cloud 唔會將 Screenshot 或 Clip 寫入公開文件目錄。
- Admin Clip Delete 仍屬高風險，需額外確認。升級前先做獨立備份。Client Guest Delete 預設關閉，開啟後亦有服務端權限核對。
- 防止重覆按掣：Admin 操作期間禁用重覆提交，成功/失敗都有明確文字，Server 亦拒絕新建同名有效活動。**以前已建嘅同名 Event 唔會被自動刪除**。

## 7. 上線前建議驗收

- 用測試 Event，只連一部 Android，Save Title/10s/03 Space Age + VHS，見 APK Idle Sync 改變；攝影機／Bluetooth Printer 仍保留本地選擇。
- 測 10 秒正式 Camera＋Mic 錄影，QR 客戶電話可播；Cloud Admin Ready + JPEG Thumb + Download + Share／Browser Reprint 能成功。
- Big-screen OFF：Guest Page 唔見 Consent，Show 影片清單空。ON：Guest 未同意則不可入 Show；Guest ON + Staff Approved 則私人 Slideshow 有影片；撤回後退出清單。
- Guest Delete OFF 時 UI/後端均拒絕客人 Delete；ON 再單獨測試一段**專用測試片**，確認二次確認及 Cloud/Local 刪除規則。唔好用珍貴影片測試。
- 斷網：Android 本機仍保存，可待重新連線 Upload；關閉 App 不會在背景保證同步。
- 用你實際 32 吋 Android Landscape 验證五款 Frame、安全邊距及右下 Version 五連按；Windows EXE 和真 Bluetooth 紙票需另外實機驗證。

## 8. QA 完成／未完成

- PHPUnit 等價 Python PHP API 測試：**122 checks**（建立/遷移、私隱、Show、縮圖、Revocation）。
- Chromium UI 嘅 **Mock Cloud Admin/Guest**：15 checks（真正執行 JS，後端 Mock）；**Chromium 5-frame geometry**：139 checks，含 1920×1080 到 770×360、Version 五連按。
- Node/JS、Java 打印測試及整體 Source Ledger 另在 QA 報告記錄。本地 Chromium Mock != 真 Hostinger、真 Android 系統、真打印紙驗收。

