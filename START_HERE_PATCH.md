# RetroBooth v0.9.5 — Android Photo + QR Ticket PATCH

## 根目錄套用 (base: v0.9.4)

1. 先備份現有 GitHub Repository（特別係自行編輯過嘅檔案）。
2. 解壓呢個 PATCH ZIP，將 `.github/`, `android/`, `src/`, `tools/`, `tests/`, `docs/`, `cloud/`、根目錄檔案直接合併到你嘅 **GitHub Repository root**（同一層有 `package.json`），唔好額外包多一層資料夾。
3. GitHub Desktop 檢查 changed files → Commit → Push 至 `main`。
4. GitHub Actions → **RetroBooth - Build Android APK** → Run workflow（新 commit），完成後下載 `RetroBooth-v0.9.5-Android-TEST.apk`，留意簽名金鑰同本機影片備份。
5. Admin → 02 / DEVICE CHECK → APPLY CAMERA。Admin → 08 / ANDROID BLUETOOTH PHOTO + QR TICKETS → pair / connect → `Print QR-only diagnostic` → `Print LIVE photo + QR TEST`。
6. Admin → 04 / RECEIPT DESIGN → 選 T-2（預設）；實際錄影片需要 Microphone 成功、Hostinger guest link 同 QR receipt；獲得私人連結後先可 Print selected PHOTO + QR。

**此 PATCH 係完整 v0.9.4 既有 Repository 嘅差異補丁，唔可以當新 Repository 單獨 Build。** 如有疑問用完整 Repo ZIP。

## Safety + hardware limits

- 實際打印只支援 Android Bluetooth Classic Secure SPP、ESC/POS QR Model 2 + `GS v 0` 384x336 1-bit 相片。唔係 BLE USB 或 Windows 普遍適用驅動。
- 連線／資料已寫入 **唔代表紙張有印出**；留意 `sent_unconfirmed`、打印機型號、列印紙相片同 QR 掃描。
- QR-only diagnostic 同 LIVE photo+QR test 都係 `example.invalid` 無效測試 QR，唔連去真影片。
- 影像只喺本地保存／送到已配對嘅專用打印機；真 Guest QR 可能包含刪除授權，必須保密。
- Photo+QR 正式票預設仍顯示螢幕 QR；唔會因為未知紙張狀態自動略過。

Details: `docs/QR_PHOTO_TICKET_V095_ZH.md` and `docs/V095_TEST_REPORT.md`.
