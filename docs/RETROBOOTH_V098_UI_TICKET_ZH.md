# RetroBooth v0.9.8 — 32 吋 Android TV／雙語 Guest Page／QR Ticket 升級指南

**日期：2026-11-27　版本：0.9.8-alpha.1（Android versionCode 17）**

## 1. 今次解決的實際問題

- 32 吋 Android 横屏：01、02 舊樣保留；03 換成白色太空艙圓角機身，04 換成黑色 Broadcast Rack 方角機身／長方形 Start，05 換成透明冰藍色 Y2K Jelly 機身。三者不再只是换色。
- 右邊 RETROVISION 底下副標題超出控制板：改為可自動換行。Admin > 01 > **Guest TV display text** 可改 `TV Maker`, `TV Product`, `TV Subtitle`, `Channel`。雲端已連線則以 Event Master 設定為主，Android 空閒時同步；勿在運作中的活動同時修改兩邊造成設定混淆。
- 客人左下底部工程文字：預設隱藏 `pictureFormat` 與長私隱文。Guest 畫面右側只保留 `QR TICKET · CONNECTED / 已連接` 或 `NOT READY / 未連接`；代表目前 Android Secure SPP 連接／Pin 狀態，**不等於紙張已打印成功**。如有需要可在 Admin 啟用簡短私隱提示。Android Log/詳細 FPS 保留 Admin 畫面。
- Admin > 01 > **Render FPS cap**：Auto/12/15/24/30。呢個係處理幀率的**上限**，顯示的 observed FPS 由系統效能決定；上限 30 ≠ 保證 30。`Render height` 可選 720p（畫質）、540p（平衡）、360p（較低負載）。改低會降低輸出像素；跟隨下一個 idle session 套用，不建議進行中調整。
- Hostinger Guest Page：影片開啟、等待上傳、下載、重新連線／重新授權、Big-screen 同意及 Guest Delete 對照廣東話／英文。Big-screen 和 Delete 權限由 Cloud Event 開關分別控制，預設關閉。**Reconnect playback** 只重新獲取影片授權，唔係重新拍攝。

## 2. 新 QR Ticket 設計

喺 Android Admin **04 / RECEIPT DESIGN**：

| 設定 | 可選內容／解釋 |
|---|---|
| Template | Classic memory、Cinema ticket、Minimal、Red-carpet Premiere、35mm Filmstrip、Memory Boarding Pass |
| Orientation | Portrait（384-dot 58mm 實體打印），Landscape（624px *Browser／預覽專用*） |
| Screenshot ratio | 4:3（384×288）／16:9（384×216），影響真正熱敏相片內容 |
| Screenshot moment | 倒數 T−1／T−2（預設）／T−3；每段保留自己的捕捉時刻 |
| Ticket title/caption/footer | 中英混合；中文轉 384-dot 黑白位圖，QR 仍用獨立原生 ESC/POS QR Model 2 指令；Android print/test 訊息上限提高至 64 KiB，其他指令維持 4 KiB |
| QR test | `Test print QR only` → `Test print PHOTO + QR`；本地 Camera 開咗可用 LIVE，相機未開則明確 SAMPLE，測試 QR 沒有真人影片 |

**實體印刷限制（必讀）：** 現有 Android Secure Bluetooth Classic SPP／ESC/POS 係 58mm、384-dot 直向輸出；並未實作打印機層級自動旋轉橫票。部分熱敏機不支援 `GS v 0` 黑白圖像指令，中文字圖像可能留白或拖長打印；中文顯示需 Android 具備相應字體。Logo／中文字排版與 HTML 預覽非 1:1 WYSIWYG；無紙張感應器、無 Cutter。`sent_unconfirmed` 只代表嘗試傳輸，不能視為印好。維持螢幕 QR 作後備、未知結果勿自動重印。**QR 字串係私人 HTTPS URL，唔需要改成中文**。

### 最小實體測試

1. 先喺 Android Settings 配對 Bluetooth Classic Ticket Printer；Admin 08 以實際 MAC Pin 並 Connect。
2. Admin 02 **Apply Camera**（Mic 可稍後開）；Admin 04 先試 **QR-only**，驗證紙張／掃描可讀性。
3. 改 Caption 做 `多謝你哋 · THANK YOU`，試 **PHOTO + QR**；檢查相片、中文和 QR 是否真印出來。
4. 分別試 4:3／16:9；如打印不支援點陣／中文，回報**打印機品牌型號、紙張相、Admin Full Diagnostic JSON**（刪除密鑰），不要直接啟用 Guest Fast Return。

## 3. 更新 GitHub／Android APK

1. **備份本機 Android 影片**、Hostinger `config.php`／`data/`。如果正在使用舊 APK，必須保持原有簽署身份，避免卸載造成影片遺失。
2. 下載並解壓**唯一 v0.9.8 Full GitHub Root ZIP**（同一版本源），先 `Fetch/Pull origin`。
3. 以 `SYNC_TO_GITHUB.cmd` 同步到 GitHub Desktop Clone 路徑（ZIP 放 Repository 外），確認所需檔案、顯示 `PASS`；Commit／Push **同一個 Branch**。舊失敗 Run 的 Re-run 仍會用舊 commit，要開新 Run。
4. `RetroBooth - Source Preflight (Fast)` 綠燈後，`RetroBooth - Build Android APK` 選同一 Branch 按 **Run workflow**。
5. 要到成功的 Run **Artifacts** 下載 `RetroBooth-v0.9.8-Android-TEST.apk`；唔好將 Evidence／Unsigned AAB 當 APK。此來源 ZIP **不包含已編譯 APK**。Windows 可用獨立 Workflow Build EXE；Windows 原生打印仍未實作。

## 4. 更新現有 Hostinger（PHP，毋須 Node.js）

1. 先備份已有網站 `public_html` 及 `retrobooth_private/config.php`、`retrobooth_private/data/`（影片及資料）。**絕不可將私有資料夾放入 public_html，唔好將密鑰上傳 GitHub。**
2. 解壓 **v0.9.8 Hostinger PHP Cloud Update ZIP**。將其 `public_html/` 入面內容合併到現有網站 `public_html/`；將 `retrobooth_private/app/Cloud.php` 及 `tools/cleanup.php` 等 **code-only** 對應覆蓋。
3. **不要刪除、覆寫或重建**現有 `retrobooth_private/config.php`、`data/`，亦不要重新建立 Event／Device Bundle，除非真係有必要。
4. 開啟 `https://<your-host>/api/health` 及 `/admin/`；Event Master 儲存新 TV Brand、Ticket Style、Orientation。Android Admin 07 `Sync event settings now`（或等閒置同步）。Camera/Mic、Printer MAC、FPS 上限保持 Android 本機設定。
5. 正式活動前以**新測試 Event**、一段 10 秒錄影，確認 `ready`、Guest QR 私人播放／下載、中文雙語 UI、Slideshow 同意流程、撤銷權限。

**注意：** 舊版雲端 Event 會保留；同名 Event 仍然係獨立的事件 ID。此 ZIP 未經實際 Hostinger 或 32 吋 Android 最新版本硬件驗收，亦未實機證明 QR 印紙成功。

## 5. 操作重點

- `RETROVISION` 同副標題可喺 Android Admin 01 或 Cloud Event Master 修改，並非不可改的程式常數。
- 當日拍攝期間如實際 observed Render FPS 只有 8–10，不應提升 FPS cap 期望強行加速；先試 540p，再按錄影畫質決定是否使用 360p。
- Big-screen 同意只會於 Event Big-screen 啟用時顯示；雲端客人刪除必須另行啟用。私人 QR 播放與 Staff `Approve for show` 互相獨立。
- `Reconnect playback`／`重新連線` 係更新過期串流授權，唔會刪除或重新錄製影片。
- 如果要真正 **橫向實體熱敏票／Logo／中文全版所見即所得**，要先確定實際 Ticket Printer 型號、支援 80mm/58mm 紙、ESC/POS 指令及裁紙能力，再開發相應 Printer Profile，唔能夠單靠畫面轉橫就保證可印。
