# RetroBooth v0.9.5 — Google Drive Event Mirror 設定及驗收指南

**版本** `0.9.5-alpha.1` · Android `versionCode 14` · Windows APK／EXE 獨立 GitHub Actions。**本版係 Google Drive Mirror（額外副本）Pilot，不係 Google-Drive-only Guest QR 或雲端取代方案。**

## 1. 功能及流程

RetroBooth Android / Windows → 本地錄影 → **Hostinger 私人 Event 儲存** → 真正 Guest QR／手機下載。

同時，如你在 Cloud Admin 啟用：**Hostinger 已驗證 Ready 影片 → Google Drive / 指定 Base Folder / Event 子資料夾 / 原始 MP4 或 WEBM**。Upload 由 Hostinger 嘅獨立 **PHP CLI Cron Worker** 處理；唔會阻塞 Kiosk 錄影，亦唔會喺 Android 保管 Google OAuth Client Secret。

```
Google Drive / My Drive（或者你授權、具可寫權限嘅現有 Folder）
└── RetroBooth Events/               ← Cloud Admin 建立，或者 One Pick 揀現有
    ├── Alex & Sam - a14b5e91/       ← 自動 Event 子資料夾（ID 去重）
    │   ├── Message_0001_<clipid>.webm
    │   └── Message_0002_<clipid>.mp4
    └── Luce Gala - d36fe704/
        └── Message_0001_<clipid>.webm
```

**Hostinger 永遠係 Guest QR／私人連結嘅來源。** Google Drive 係活動管理員嘅可選副本；客戶 Event ZIP 分享仍然由 Hostinger 獨立控制，Google Drive 不會自動公開給客戶。舊事件可手動開啟鏡像；新事件可透過 `Auto for NEW events` 設預設。Event ID 與 Drive Folder 綁定，改 Event 名唔會默默移動舊影片。

## 2. Google Cloud Console 一次性準備

1. 登入 <https://console.cloud.google.com/>，建立／選擇**你自己控制**嘅 Google Cloud Project。
2. `APIs & Services → Library`，Enable **Google Drive API**。
3. `Google Auth Platform / OAuth consent screen`：設定產品名稱、support email、授權使用者。私人測試可加自己 Google 帳戶做 **Test user**。正式商業服務可能需要 Publishing/Verification；Testing 模式嘅 refresh token 可能只有 7 日有效期，唔可以當永久運行。
4. `Clients → Create client → Web application`，設置**完全一樣**嘅 Authorized redirect URI：

   `https://YOUR-HOSTINGER-DOMAIN/api/drive/oauth/callback`

   唔好加結尾 `/`，HTTPS 必須使用真實網域、有效 SSL。`YOUR-HOSTINGER-DOMAIN` 要換成實際 Hostinger domain；請確保你有網域控制權及合法用於 OAuth。
5. 複製 **Client ID**、**Client Secret**；只貼喺 **Hostinger `public_html` 以外**嘅 `retrobooth_private/config.php`；永遠唔好寫入 Android／GitHub／公開前端。

```php
// 加在現有 private config.php return array 入面；保留原本 adminKey/signingKey/dataDir/CORS。
'googleDriveClientId' => 'YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID',
'googleDriveClientSecret' => 'YOUR_GOOGLE_OAUTH_WEB_CLIENT_SECRET',
```

OAuth 使用有限嘅 `https://www.googleapis.com/auth/drive.file` 權限，透過 Google One Pick 對你特別揀選嘅 folder 授權，或只建立本 App 自己嘅 folder；唔要求整個 Google Drive `drive` 全權限。Google OAuth **唔可以**在 Android WebView 內進行，因此 Admin 會開啟 Android 系統瀏覽器或電腦外部 browser。

官方技術參考：
- Google Drive API Scope：<https://developers.google.com/workspace/drive/api/guides/api-specific-auth>
- Google One Pick（system browser / `trigger_onepick=true`）：<https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker>
- Google OAuth browser policy：<https://developers.google.com/identity/protocols/oauth2/policies>

## 3. 安全升級 Hostinger Cloud

1. **完整備份**既有 `retrobooth_private/config.php`、`data/state.json`、`data/events/`、舊 `data/clips/` 及 Event Archive；如已有 Drive 設定，亦備份 `data/.google-drive.json`。
2. 從 `RetroBooth_v0.9.5_Hostinger_Cloud_Alpha.zip` 將 `public_html`／`retrobooth_private` 既有程式內容合併上網站；**唔好刪除舊 Data、唔好以 Example Config 覆蓋真實 Config、唔好重生 signingKey / adminKey**。`retrobooth_private` 必須係 web root 以外（同 v0.9.4 一樣）。
3. 保留原本 `publicOrigin` 為精確 `https://YOUR-HOSTINGER-DOMAIN`，保留 Android 原有 Approved Origin；如新增 Windows 端，按需要追加 `retrobooth://app` 到 `corsOrigins`，而唔係清掉現有設定。
4. 檢查 PHP 8.2+ CLI、OpenSSL、JSON、可用之 `allow_url_fopen`、伺服器連到 `oauth2.googleapis.com`／`www.googleapis.com`、Private Folder 有寫入權限。
5. 設定原有 ZIP archive/cleanup Cron（如果尚未設），**再新增 Google Drive Mirroring Cron**，例如每 5 分鐘：

   `php /ABSOLUTE/PRIVATE/PATH/retrobooth_private/tools/sync_drive.php`

   Cron 工作檔案**只限 private 位置**，絕不能經 `public_html` URL 執行。手動 SSH 測試同一條指令，應回 JSON `{"status":"not_connected_or_parent_not_selected",...}` 或各次同步計數；請勿於畫面顯示 OAuth token。
6. 建議先喺 staging domain + 測試 Event 做一次真機驗收，確認 PHP worker 無 timeout／quota 問題先用正式活動。

**Hostinger Cloud 原始影片仍維持原本 Event 資料夾；Google OAuth refresh token 以 AES-256-GCM 加密保存在私密 `data/.google-drive.json`，加密金鑰由現有 signingKey 派生。** 更換 signingKey 會影響已有私密連結及 Drive token 解密；切勿當成普通設定修改。

## 4. Admin 入面完成 Google 授權同揀 Folder

1. 登入 `https://YOUR-HOSTINGER-DOMAIN/admin/`（Cloud Admin，使用原有管理金鑰）。**Android Admin → Private Cloud Delivery → Manage Events + Google Drive** 可以用系統瀏覽器開呢頁；未 Connect Hostinger Event 前，請直接用 Chrome 開網址。
2. 揀 **Connect Google account**，喺 Google 系統瀏覽器登入並授權。Google 回到單次 Callback 成功頁後，返 Cloud Admin 按 **Refresh status**。
3. 設置 Base Folder，二揀一：
   - **Choose existing Drive folder**：Google One Pick 揀你想用、可以新增子資料夾嘅既有 Folder。每次需獨立短期授權。
   - **Create & use new folder**：喺你嘅 My Drive 建立（例如 `RetroBooth Events`），並自動選取。
4. 勾 **Enable Drive copy for NEW events by default** → **Save default setting**；之後 Create Event 會按預設自動同步。
5. 如想同步舊 Event：揀 Event → 按 **Enable Drive copy for this Event**。Worker 下次執行會建立對應 Event 子資料夾，並補傳嗰個 Event 所有符合條件嘅 Ready 影片。
6. 每個 Event 可以隨時停止**新** Drive Upload，Hostinger QR／Client ZIP 不受影響。**Disconnect** 不會自動刪除 Google Drive 已上傳影片；如有待處理 remote-delete，需用**同一 Google 帳戶**重新 Connect。

## 5. 驗收清單（請親自測）

- [ ] Hostinger Admin `Google Drive: connected` 並顯示正確帳戶／Base Folder。
- [ ] Android/Windows 正常錄 10 秒，Guest QR 用另一部手機掃碼可下載 Hostinger Ready 影片。
- [ ] 用真正連接 Event 的 Kiosk 錄 1–2 段，Hostinger Admin 出現 Ready。
- [ ] 執行 `sync_drive.php` Worker，Google Drive 自動建立該 Event Folder，檢查影片大小、內容、聲畫。
- [ ] Cron 重跑不應重複產生檔案；Event A 檔案唔會落 Event B Folder。
- [ ] 喺 Guest 或 Admin 做 Delete；Hostinger 連結即時撤銷，Drive 影片則待 Worker 排隊刪除。**未確認 Drive 刪除成功前唔好當已移除所有副本**。
- [ ] 停用或 Disconnect Drive 後，Hostinger QR／Client ZIP 照常運作。
- [ ] 不使用已公開分享之父資料夾；確認誰有 Google Drive / Event Client ZIP 存取權。

## 6. 已知限制（Alpha Pilot）

- **未經真實 Google OAuth／Drive API 測試、未喺 Hostinger 真實 Cron／Android 更新 APK／Windows EXE 驗證。** Google 模擬 API／PHP HTTP／Browser UI 測試不能代替實際 OAuth 帳戶驗收。
- 此版**沒有 Google-Drive-only** 上傳替代 Hostinger Guest QR，亦唔會自動生成 Google Drive 分享連結給客人。Guest QR 必須用 Hostinger，Event 交付仍用先前私人 ZIP。
- Drive copy 包含啟用 Event **所有已驗證影片**，包括喺 Slideshow Hidden 但未 Delete 嘅片。開啟鏡像前要確認客人同意；Google 父 Folder 如果已 Share，子 Folder 可能繼承存取權。
- Google Drive API quota、帳戶容量、Google OAuth consent approval、Hostinger Shared Hosting 出站連線／Cron 超時等可能令同步延遲或失敗；Worker 提供重試及狀態記錄，但唔保證高可用性。
- Google Shared Drives 複雜情況／跨 Google 帳戶搬遷／直接 Drive 分享權限不屬本版實際驗收範圍。首次連接嘅 Google 帳戶會被識別綁定，以防止後續 Event 副本或刪除任務靜靜切換到另一個帳戶。
- 每個 Worker 運行會分段處理影片，對高流量 Event 要安排足夠 Cron 次數；唔好直接依賴 Mirror 當唯一備份。

## 7. GitHub Source 更新

現有 v0.9.4 Repository → 解壓 `RetroBooth_v0.9.5_Google_Drive_Event_Mirror_PATCH.zip`，**合併到 repo 根目錄**（與 `package.json` 並排），保留 `.github` dotfiles。Commit + Push 新 `main` commit，先 Build Android 或 Windows（原有兩個獨立 Workflow 保留），完整 Verify 另外做。

Android App ID 不變，versionCode 升到 `14`；請用**相同 Android Test Keystore** 更新，先匯出重要既有影片。原生 APK / EXE **不包含**在本 Source ZIP，亦未聲稱已原生編譯成功。
