# RetroBooth v0.9.8-alpha.1 — 交付與 QA 報告

**範圍：**由 v0.9.7 source 基準修改 UI/Guest Page/ESC-POS Unicode 標籤，並保留 Cloud 私隱、身份驗證、已有影片資料與 Android App ID。2026-11-27。

## 已做嘅驗證（本地真測試，而非推測）

| 測試 | 結果與性質 |
|---|---|
| `npm test`（Desktop／Cloud JS／Safe media／Builder） | 46/46 通過，Node.js |
| `python tools/test_native_core.py` | 舊 Java ESC/POS／Ticket Journal／安全測試 85/85，新增 Unicode raster 9/9，真 JVM／模擬 Bluetooth transport |
| `python tests/cloud_api.py` | 124/124 真 PHP HTTP + 輸入／私人影片／Event Master／Guest Consent／Delete 測試。使用臨時 PHP server、非正式 Hostinger |
| `browser_v097_styles.py`（按 v0.9.8 外框特徵更新） | 203/203 Chromium Viewport＋五連按 Admin，1920×1080、1280×720、960×540、770×360 |
| `browser_v04.py --group layout`（按 privacy 預設關閉更新） | 234/234 Chromium Layout，亦包含 390px/320px portrait |
| `browser_v098_polish.py` | 36/36 TV Brand／Auto-wrap／Status／Caption 中文 1bpp／Ticket Orientation／Guest 中英文本 |
| `browser_v096_receipt_printer.py` | 19/19 Native Bridge **模擬**（4:3／16:9，紙張結果仍未確認） |
| `browser_v097_cloud_mock.py` | 15/15 Cloud Admin／Guest UI Mock |
| 舊版 Browser Regression 全組執行 | 30 組全部有執行；**27 組首次通過，3 組因測試預期仍引用已棄用 UI 字句而首次失敗**。修正三份測試後，分別重新執行 `browser_v04-layout` **234/234**、`browser_v07-booth-cloud` **32/32**、`browser_v07-guest` **15/15**，全部通過；其餘 27 組合共 **649 項**通過。共覆蓋 **930 項**成功檢查，但**不是同一個 30/30 單次全綠 Run**。|
| `python tests/test_apk_metadata.py` | 7/7：驗證 APK VersionCode 17、VersionName、Package ID，模擬錯版會被攔截；非 Android 原生編譯 |
| 完整 GitHub Source ZIP → 模擬 Git Commit → Fresh Clone | **204 個受保護來源檔案 SHA-256 通過**；完整 ZIP 另有 RELEASE Source Ledger／Package Manifest；不代表 GitHub 遠端目前已 Push |
| Android package | App ID 沿用 `studio.luce.retrobooth.preview`，versionCode 17；Gradle／Java Android **未喺本機跑完整 SDK 編譯** |
| Windows Electron | 本地程式／準備測試；**未生成實際 Windows Installer／Portable EXE** |
| Hostinger | PHP 語法／功能測試通過；**未部署到你目前 live Hostinger**，`config.php`／`data` 未修改 |
| 58mm Ticket Printer | ESC/POS GS v 0 指令資料、QRCode Model 2 同 raster 結構於 JVM 檢查；**未連接實體 Bluetooth 打印機或掃描紙張 QR** |

## 設計與行為風險

- **橫向票面**只有 Web／Browser Preview，Android 58mm Secure SPP 仍直向；嚴禁將此 Preview 當成真正橫紙出紙驗收。
- **中文文字圖像**由裝置 Canvas 產生 384-dot 1bpp，再交原生 Java ESC/POS；會受 Android 字體、打印機圖像指令、走紙與濃度影響。Printer Native Bridge `print/test` 總長度上限 64KiB，其他命令 4KiB。
- **FPS** 為處理上限值與系統實際測得值，不是實際 Camera FPS；更低 output canvas 解析度換取可能更高的流暢度。
- **Cloud** 必須保留現有 `retrobooth_private/config.php`、`data/`，不可誤認 Hostinger PHP 為 Node.js；Event Master 可以覆寫管理式設定，但硬件／Performance 在裝置本機。
- Android APK 與 Windows EXE 要喺 GitHub Actions **成功編譯並提供 Artifacts**，工作樹通過 Node/Browser/PHP/JVM 測試不能代表完成原生編譯或現場運作。
- 已保存嘅私有 Guest Link、已有 QR/打印紀錄保持舊格式相容；不可因測試而刪除本機 APK 資料或伺服器影片資料。

## 建議正式活動驗收流程

1. GitHub Desktop 用唯一完整 Full Root ZIP + `SYNC_TO_GITHUB.cmd` → Commit/Push → Source Preflight → Android APK Workflow 新 Run 成功。
2. 保留原 APK 簽署身份，先備份錄影，安裝 v0.9.8 到 32 吋 Android Monitor。
3. 檢查各 TV Stage：右側 Brand 文案完整、QR Ready/Not Ready、畫面無遮擋、Start、五連按 Version；12/15/Auto FPS 觀察，540p 影像清晰度與運作負載。
4. 把 Cloud PHP Code Update 上載到 staging/測試活動，確認 Event 設定同步、中英 Guest、權限預設 OFF、播放下載、Consent/Staff Approval。
5. 先試實體 Ticket `QR only`，再 `PHOTO + QR` 和中文 Caption，逐張掃 QR、核對影像比例、明確記錄成敗。打印沒 paper ACK 時保留 on-screen QR。
6. 以 1–3 人場景測試 10／30／60 秒录影、錄音、網路斷線補傳、Guest 私人連結；確認雲端 ready 而唔係 reserved。

QA 截圖：`RetroBooth_v0.9.8_Five_Distinct_TV_Styles_Preview.png` 與 `RetroBooth_v0.9.8_Six_Ticket_Layouts_Preview.png` 係 Chromium 跑真程式嘅畫面，並非 AI 概念圖，也非實體熱敏紙照。
