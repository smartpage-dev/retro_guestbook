# RetroBooth v0.9.10-alpha.1 — Android USB／自訂資料夾第二份影片備份

**2026-11-28 · Android `versionCode 19` · 保留 package ID `studio.luce.retrobooth.preview`**

## 1. 今次新增啲乜

v0.9.9 原有影片先儲喺 Android WebView／IndexedDB；每次手動另存先用 Android `ACTION_CREATE_DOCUMENT`。v0.9.10 加 **Android Admin > 09 / LOCAL USB VIDEO BACKUP**：可經 Android 系統 `ACTION_OPEN_DOCUMENT_TREE` 揀一個 USB 手指／其他可寫入資料夾。一次設定後，真正錄影片在 IndexedDB 成功保存後，於 Booth **閒置**期間額外複製到所選資料夾。

**絕對唔係取代原本儲存位置**：IndexedDB 仍是本機第一份原片；USB 只係另一份獨立副本。USB 複製失敗、拔走／重新插入、沒空間或停機，唔會主動刪除原片；複製不阻礙 QR、拍攝同 Cloud upload 的原有流程。畫面預設 360p／24fps 同 TV 01–05 設計仍然保留。

## 2. 設定一次，之後自動備份

1. 喺 Android 機上插入 **USB OTG／USB-C 手指**；確保 Android「檔案」App 睇到該 USB。建議先建立 **一個活動專用資料夾**，例如 `2026-Event-ClientVideos`。不要用客人可直接操作的公開 USB 位置。
2. 安裝 v0.9.10 TEST APK，更新前保留原有簽署身份。**不要卸載舊 APK，不要 Clear data**，以免 IndexedDB 原片消失。更新前已保存的影片仍然會在 Tape Library 裡。
3. 按版本文字五次進入本機 Control room → 捲到 **09 / LOCAL USB VIDEO BACKUP** → **Choose USB / Folder**。Android 系統會彈出資料夾選擇器；揀到 USB 上面活動資料夾，按「使用此資料夾」及授權。Android 11+ 有部分根目錄不可直接選，請先進入／建立子資料夾。
4. 成功後會建立 **EVENT BACKUP SCOPE / 活動影片範圍**，預設 **只包含選資料夾之後拍攝、與當前活動 Title + Date 一致的真實影片**。App 閒置時自動備份合資格新片；**舊活動片絕對唔會因為插入新 USB 而自動一齊複製**。Admin 清楚顯示本次選中幾段、排除咗幾段。**Demo 無影片，唔會產生 USB 檔案**。
5. **如果活動結束先插 USB：**喺 Event Backup Scope 的 `Include earlier clips from` 揀今次活動真正開始日期／時間，按 **Review & include earlier clips**；系統會展示同今次活動名稱／日期一致、有幾多段舊影片會加入，須工作人員確認先補備份。每個活動請使用另一個 USB 子資料夾；如有相同活動名／日期但其實屬另一批客人，務必用開始時間核對，避免洩露舊片。延長範圍只可向前包含舊片，唔可以透過縮短範圍去假裝 USB 上已複製的舊片被刪除。
6. 可按 **Pause auto backup** 暫停，權限及舊 USB 檔案保留；**Resume** 繼續。更換 USB 時按 **Choose USB / Folder** 選另一個活動資料夾；每個已授權資料夾以獨立 ID 記錄完成狀態。**如果 Admin 活動名稱／日期變更，舊 USB Scope 將停止自動接納新活動影片**；應先建立新活動資料夾再重新選擇。選錯或 USB 失聯時，原片都不受影響。

**檔案格式：** 跟原錄影格式，通常係 `.webm`，部分裝置可能輸出 `.mp4`；**不會自動轉檔**，所以畀客戶之前最好用 Windows/Mac／客戶需要嘅播放器測試。範例檔名：`RetroBooth_20261128193045_00043_bbbbbbbbbbbbbbbb.webm`。每段以原本拍攝時間、序號同錄影 ID 命名，唔包含私密 QR、密鑰或 guest access URL。App 唔會自動建立子資料夾；請先選好活動資料夾。

## 3. 儲存與驗證規則

- **原片先成功儲入 IndexedDB**，之後先進入 USB 待複製清單。無本機原片唔會虛報 USB 完成。
- 每段影片使用獨立固定檔名；重試時，如果相同檔名已存在，會核對檔案長度同 SHA-256，一致就承認係已完成，不會盲目再寫一份；如果存在不同內容，報錯並保留原片，請工作人員檢查衝突檔，**不會覆蓋客戶現有檔案**。
- Android 會先建立 `INCOMPLETE_...` 暫存文件、逐塊寫入，讀返 USB 全段資料核對 SHA-256，然後重新命名成正式檔，再讀返正式檔驗證。成功先喺 Admin 標記 **VERIFIED**；如果 USB 文件供應者唔支援必要重命名，會報失敗並建議改用兼容儲存裝置。
- 出錯會嘗試刪除本次建立的暫存文件；如 USB 突然拔走或系統中斷、供應者拒絕刪除，可能留下 `INCOMPLETE_...` 檔；呢啲**唔係完成備份**，可於活動後人工檢查／清理。
- 若客人拍攝中途開始，系統會停止額外 USB 備份嘅分塊傳輸，待 Booth 閒置再重試；相機／音訊及本機保存唔依賴 USB。
- 備份結果及 Event Backup Scope 儲存於原本 IndexedDB 設定倉，按 **資料夾 ID + 影片 ID** 記錄；即使複製途中 App 意外關閉，原片仍在，返回 Admin / Idle 再補備份。此處是**重新複製**，不是續傳尚未完成的 USB 暫存檔。Scope 以活動名稱／日期及錄影時間範圍限制可交付片，不代替工作人員對客戶身份與影片權屬的核對。
- 每段大小上限為 **256 MiB**（Android Native Bridge 限制）；超過上限會報錯並要求使用獨立手動 export。非 Android 安裝的瀏覽器、Windows EXE 不具備呢個原生 USB 自動備份橋接。

## 4. 活動完畢：交 USB 畀客戶之前

1. 完成最後一位客人，返回 Booth 閒置，去 Admin 09，按 **Check USB status**。確認資料夾 Online、auto backup ON、**Event Backup Scope 顯示的已選影片數量正確**。先檢查今次客戶應收的影片數量，舊活動影片預設排除。
2. 如果 `NOT VERIFIED` 大於 0，按 **Copy pending clips**；若出現 failed，確保 USB 仍插好、有空間、資料夾可寫，然後再次重試。**唔好只睇 `Verified / Total` 之前的舊紀錄就即刻拔 USB**。
3. 按 **Verify all before hand-off**。呢步會由 USB 重新讀取**目前 Event Backup Scope 內**每段影片並逐段驗證 SHA-256，確認顯示 `ALL SHA-256 OK`，無 missing / invalid。Scope 排除的其他活動影片**不會被驗證或複製**；先核實數量係咪今次客戶應收到嘅全部影片。
4. 再用 Windows 或 Mac **真正開啟播放幾段影片**，確認片長、聲音及影片格式兼容。SHA-256 一致只代表複製位元組一致，唔等於影片在客戶裝置一定可以播放。
5. 正常安全卸除／退出 USB，交畀活動主辦方。USB 數據需按照主辦方同嘉賓同意條款保管。

如舊備份 USB 曾被格式化／檔案已被外部刪除，但 Android 回傳同一 folder ID，舊完成紀錄可能仍在。**交付前一定執行 Verify all**：缺少或損壞嘅影片會重新標記 failed，再按 Copy pending 重試。不同內容的同名檔不會自動覆蓋，請先人工處理衝突。

## 5. 隱私、硬件與版本限制

- USB 係獨立外部實體副本。**Guest Delete、Cloud 撤銷、App 刪除本機錄影，唔會刪除已交出嘅 USB 影片。** Event Backup Scope 預設隔離之前錄影，但必須確認本次活動名稱／日期、開始時間及數量。 工作人員須決定係咪有授權把整個活動嘅影片交畀客戶；唔好將私人影片放喺公開 USB／共用資料夾。
- Android `ACTION_OPEN_DOCUMENT_TREE` 屬系統授權，唔需要 `MANAGE_EXTERNAL_STORAGE`、USB root path 存取或額外 Storage runtime permission。是否能看見／寫入 USB、FAT32／exFAT、USB OTG 供電、資料夾重命名能力，都由 Android 設備與實際 USB 裝置決定。
- `Forget selected folder` 只撤銷 App 內目標／授權，**唔會從 USB 刪除已備份檔**。手動單片 Android `Download` 功能亦繼續保留。
- 本輪已用真正 Chromium 模擬 UI／Native Message 橋接，加上 Node.js 複製／中斷／重試／偽造檔案測試，但**未有 32 吋 Android 實體機 USB 插拔、文件供應者重命名、速度、長時間錄影及實機 APK 驗收**。生產活動前需真機跑 3–5 段及完整交 USB 演練。
- 使用 Android v0.9.10 APK 要維持原先 TEST 簽署身份；同樣 package ID，versionCode 19。GitHub Actions 發布的是 TEST APK，需要自己建立並下載 Artifacts；本來源 ZIP 不包含編譯 APK。官方 Hostinger PHP 只負責原有 Cloud 服務，**無法直接存取插在 Android 上的 USB**。

## 6. GitHub／Hostinger 更新

Android GitHub 完整 ZIP 請直接跟原本 `SYNC_TO_GITHUB.cmd` → GitHub Desktop Commit/Push → Fast Source Preflight → `RetroBooth - Build Android APK`（新 Workflow Run）；原有雲端同 Java Android printer logic 保留。若更新 Hostinger，先備份 `public_html/` 及 `retrobooth_private/config.php`／`data/`，只合併 v0.9.10 **code-only** ZIP，**不可覆蓋、移動或公開原有 config／data／私密影片**。Hostinger 更新並非 USB 功能必需條件，USB 功能只靠新 Android APK。
