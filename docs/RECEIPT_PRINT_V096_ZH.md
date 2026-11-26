# RetroBooth v0.9.6 — Admin 04 直接印 QR Ticket＋4:3／16:9 相片

## 操作位置

- **Admin → 04 / RECEIPT DESIGN**：`Ticket screenshot aspect ratio` 可以選 **4:3（預設，384×288 pixels/dots）** 或 **16:9（384×216）**；改選後右側 Receipt Canvas 即時更新，亦會影響下一段錄影的 T−2 截圖／實體票面相片。
- 保留 `Ticket photo capture moment` 預設 **Countdown remaining 2 seconds (T−2)**；亦可選 T−1／T−3。關閉倒數時用錄影開始的畫面。
- **Test print PHOTO + QR**：使用目前版面 Form 的事件名稱、Caption／Footer／Style 及畫面比例，**唔使先 Save**。Camera 已啟動則拍真正 Live 畫面；Camera 未啟動則會印上 `SNAPSHOT TEST SAMPLE` 標記的示範 CRT 畫面。**不需要 Microphone**。
- **Test print QR only**：只傳英文測試標題及原生 QR，毋須 Camera／Mic，適合先確定 Bluetooth／QR 扫描可用。
- **Printer settings / 08**：直接捲到 Admin 08 Bluetooth 配對／連接區域。兩個 Test Print 按鈕僅於原生 Android 打印橋接已接駁 Printer 時可用。
- Receipt Mode 若選 **QR only**，Photo + QR Test 自動只印 QR；Photo only 的硬件診斷仍包含無效測試 QR，**不是正式賓客交付模式**。

## 連接方法

1. Android Settings > Bluetooth，手動配對支援 **Bluetooth Classic / Secure SPP、ESC/POS、58mm / 384-dot** 的打印機。
2. RetroBooth Admin **08 / ANDROID BLUETOOTH PHOTO + QR TICKETS** → Nearby Devices 權限 → Refresh paired devices → 檢查 MAC → Pin selected printer → Connect secure SPP。
3. 返回 Admin 04，揀 **4:3** → **Test print QR only**，檢查紙張及用手機掃描是否 `https://example.invalid/...`；唔會有真正影片。
4. 再按 **Test print PHOTO + QR**，核對票面相片寬高約 **4:3**；切換 **16:9** 再印一次，應該見到相同寬度但較矮的相片。
5. 若要 Live 人像，先 Admin 02 按 **APPLY CAMERA**，不需要 Mic，返回 Admin 04 再按 Photo + QR 測試。
6. 測試完成後 **Save design + settings**，下一段正式錄影才會永久儲存新比例。新錄影保存的是自己的 T−2 截圖，不會使用其他客人的最新畫面。

## 重要限制（唔可以當成已驗收）

- 04 右側 Receipt Canvas 係高質素**螢幕設計預覽**。實體 ESC/POS 仍使用**原生 QR 指令＋4:3／16:9 黑白點陣＋英文字標題／Caption／Footer**；紙張字體／字距／模板只有限度相近，**Logo／中文並未實際印到紙**，未達真正 WYSIWYG。
- `sent_unconfirmed` 只代表資料送到 Bluetooth Socket，**唔代表紙張已印完**。無紙張感測器、自動切紙、BLE／USB／Windows printer 支援。QR 請用手機親自掃；顯示 QR 仍保留後備。
- **舊 v0.9.5 錄影**仍採用舊 384×336（8:7）Ticket crop；唔會因修改新比例而偷偷改動既有票。既有 QR-only 指紋／Ledger 不重寫。
- 測試 Printer 一定會出原生確認對話框；印出內容唔會自動重印；結果不明時先睇紙同日誌，再人手決定是否需要重新測試。
- 新 Build 版本 **v0.9.6-alpha.1 / Android versionCode 15**，必須用 **相同簽名 Key** 更新，先可以保留之前本機影片。未有 Android 原生 SDK、真 Bluetooth 裝置、熱敏紙面或 QR 掃描實測；GitHub Build 完成後要逐項驗收。

## 測試證據

- `tests/browser_v096_receipt_printer.py`：04 選擇器／Preview 高度／Draft／Bluetooth Test Payload／Mock printer response／無 Camera Sample／Live Camera／16:9 像素與 QR-only。
- `tools/test_native_core.py`：Java ESC/POS 指令、QR 原生命令／安全 Ledger、不同圖像高度／舊版兼容（模擬傳輸，不是實物）。
- `qa/v096-receipt-designer-43.png`、`qa/v096-receipt-designer-169.png`：Chromium 真程式畫面，非 Android 實機截圖。
