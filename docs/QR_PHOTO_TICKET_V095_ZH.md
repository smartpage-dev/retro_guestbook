# RetroBooth v0.9.5 — QR Ticket 真打印及倒數相片擷取測試指南

## 1. 功能同限制

- **Android APK** 用已手動配對並固定 MAC 嘅 Bluetooth Classic / secure SPP Printer，真正送出 ESC/POS 位元資料：**384×336 黑白相片（GS v 0）+ 原生 QR Model 2 + 英文 Message 編號**。
- **01 Modern CRT / 02 Heritage TV** 同一個倒數相片擷取功能，**預設 T−2 秒**。Admin → **04 / RECEIPT DESIGN** → Ticket photo capture moment 可揀 **T−3 / T−2 / T−1**。呢個係錄影開始前剩餘秒數，唔係錄影開始後第幾秒。
- 停用準備倒數（0秒）時，Ticket 相片會在 **REC START** 擷取；該結果亦會清楚標記。
- 保存兩張不同用途嘅圖片：`ticketSnapshot`（倒數指定秒數，黑白熱敏相片來源）及既有 `rawSnapshot`（錄影中最佳畫面）。**打印只使用該 Recording 自己儲存嘅相片**，唔會誤用下一位客人嘅鏡頭。
- Admin → **08 / ANDROID BLUETOOTH PHOTO + QR TICKETS** 有兩個獨立硬件操作：`Print QR-only diagnostic` 及 `Print LIVE photo + QR TEST`。第二個需要先 Apply Camera；QR 係 `example.invalid` 測試連結，唔代表有真正影片。
- 已保存並有真正 Hostinger private guest QR 嘅錄影：`Print selected PHOTO + QR once` / `Reprint SAME ticket layout...`；新拍攝嘅 photo+QR 用預設倒數圖，舊錄影會用舊版保存嘅最佳截圖（非 T−2）。`QR only` receipt 就只印 QR。`Photo only` 沒有 Guest QR，不可用 QR printer path。

**尚未測到實體票紙！** 傳輸回報 `sent_unconfirmed` 只代表資料寫入 Android Bluetooth OutputStream，唔係打印機確認紙已出、圖片完整、QR 可掃。QR 對應 Private guest link（可能含管理／刪除權限），應避免派錯畀人。條碼請親身用手機掃描確認。

## 2. GitHub 安裝

1. 下載 `RetroBooth_v0.9.5_Photo_QR_Ticket_PATCH.zip`，解壓並將內容合併到現有**完整 v0.9.4** Repo 根目錄（包含 `src/`, `android/`, `.github/`, `tools/`）。**唔好整多一層資料夾**。或者使用完整 Repository ZIP 作新基線。
2. 用 GitHub Desktop Commit / Push 至 `main`，喺 Actions → **RetroBooth - Build Android APK** → `Run workflow`。
3. 成功之後下載 `RetroBooth-v0.9.5-Android-TEST.apk`。如果簽名唔同，Android 唔可以直接覆蓋，唔好為測試隨便卸載而刪失本機錄影。
4. 開 App → Admin（右下角 Version 按 5 次）→ **02 / DEVICE CHECK** → `APPLY CAMERA - LIVE preview`，唔需要 Mic 就可以做即時 Photo+QR Printer 測試。

## 3. 實體 Printer 測試程序

1. Android 設定 → Bluetooth → 先配對真正印票機（**必須係支援 Classic SPP + ESC/POS 嘅機款**，普通 BLE 熱敏機未必適用）。
2. RetroBooth Admin → **08** → `Grant Nearby devices` → `Refresh paired devices` → 逐字核對裝置名稱及地址 → `Pin selected printer` → `Connect secure SPP`。
3. **先按 `Print QR-only diagnostic`**，檢查紙上可見 `PRINTER TEST - NOT A VIDEO`，QR 可被手機識別；連結係 `.invalid`，**唔會打開真影片**。
4. 確保 Camera 正在 LIVE Preview，再按 **`Print LIVE photo + QR TEST`**。印出紙應有一張黑白照片 + 測試 QR；檢查圖片無被截斷、QR 能掃、文字完整及留白足夠。
5. Admin → **04 RECEIPT DESIGN** 揀 T−2（預設）並儲存。Camera + Mic ready 後拍一段 10s 片，依照 3→2→1 倒數，確認 T−2 嘅面部/動作同影像相同，再到 Admin → **08** 選擇已保存 Hostinger Cloud Clip，按 `Print selected PHOTO + QR once`；用手機掃碼核對係**嗰段影片嘅私人頁**。
6. 結果係 `sent_unconfirmed` / `outcome_unknown`，唔好自動重印。先檢查紙同打印日誌；需要時用 **Reprint SAME ticket layout...** 明確確認補印。

## 4. 建議設定及已知限制

- **Printer 類型：** 58mm ESC/POS、384-dot printable head、Bluetooth Classic Secure SPP。80mm 可能印出 384-dot 中央較窄嘅圖片。特定廠牌有可能唔支援 `GS v 0` 光柵圖片（部分 ESC/POS 設備偏向 `GS ( L`）；需提供打印機品牌型號及 Firmware 才能針對調校。
- **打印等待：** 新安裝預設 12s（Admin QR & Auto Return），上版已存設定值會保留；Photo + QR 票長，比 QR-only 花時間。實測時建議使用 12–15s。普通錄影流程仍保留 On-screen QR，**Photo Tickets 即使輸出流回報成功，亦唔會自動跳過 On-screen QR**。
- **沒有** BLE GATT、USB printer、Windows printer adapter、Logo、中文字列印、Cutting 指令、紙量／紙張感應器、已知紙張成功確認、實機持續列印驗證。
- 下載／分享 Diagnostic JSON **唔會包含實際相片位元內容或私人 QR URL**；原生 Ledger 只保存身份指紋及打印狀態。實際相片會留喺本地 Clip，刪除 Clip 時應跟原有 Delete 流程。
- 無雲端設定時仍然可用 `Print LIVE photo + QR TEST`，但不能列印真客人嘅 Private QR；真客人需先有成功預留嘅 Hostinger cloud link。

## 5. 驗收紀錄

請記錄打印機 **品牌／型號**、58mm/80mm、Bluetooth Profile、測試紙照片、QR 掃出內容是否完整、是否切紙、`Print status` 同 Diagnostic JSON。以上係下一輪針對具體打印機做相容性修復嘅依據。
