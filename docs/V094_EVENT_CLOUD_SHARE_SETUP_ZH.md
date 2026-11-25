# RetroBooth v0.9.4 — Android 有效 QR、Event 私人儲存、Client ZIP 分享（測試版）

版本：`0.9.4-alpha.1` · Android versionCode `13` · 原有 Android App ID 不變 · Windows Workflow 繼續獨立。

## 一、點解舊 QR 掃唔到？

2026-11-25 上傳嘅 v0.9.3 Diagnostic 顯示 `cloudConfigured:false`，但 Camera／Mic 都係 `ready:true`。舊版會畫 `RETROBOOTH:LOCAL-PROTOTYPE:NO-ONLINE-VIDEO:<clipId>` 測試 QR。呢個唔係網址，手機唔會開到影片。**QR 問題唔係 Camera 問題。**

v0.9.4 調整：示範模式仍有明確標示 `TEST QR / NO ONLINE VIDEO` 嘅測試碼，但絕非下載連結。未連接 Hostinger 時，錄影依然可以儲存喺該裝置，但 真正錄影嘅 Guest Screen／receipt **唔再畫假 QR**，顯示 `LOCAL-ONLY / QR UNAVAILABLE`。成功連接指定 Hostinger Event、預留 Guest URL 後，先會喺新錄影顯示真正 `https://.../guest/#...` 私人 QR。上傳會喺 Booth 閒置時繼續；Guest 頁面可能暫時顯示 Upload Pending，直至影片完成上傳及 SHA-256 核實。**必須用另一部手機真實掃碼並成功下載，先算 QR 驗收完成。**

> 舊本地影片唔會因為之後連接 Cloud 就自動取得 QR 或搬到 Event。請去 Android **Tape Library** 逐一匯出仍存在嘅舊影片並妥善備份。Diagnostic 嘅 `clipCount:0` 只反映匯出當刻 App 記憶中嘅數目，唔足以證明舊錄影已上傳或仍存在。

## 二、部署 Hostinger 私人 PHP Cloud（保留原有資料）

用 `RetroBooth_v0.9.4_Hostinger_Cloud_Alpha.zip`。**先備份**現有 `config.php`、`state.json`、`data/`、及 `clips/`。唔好刪除／覆蓋現有資料、唔好重新生成 adminKey / signingKey、唔好把真實私密憑證放到 GitHub。

Hostinger PHP 網站檔案結構（示意；按你網站實際路徑）：

```text
<site-root>/
  public_html/
    index.php
    .htaccess
    admin/index.html
    guest/index.html
    client/index.html
    assets/{admin.js,guest.js,client.js,...}
  retrobooth_private/                 <-- 必須在 public_html 之外
    config.php                        <-- 原本既有私密設定，不能公開
    config.example.php
    app/{Cloud.php,StoredZip.php}
    tools/{cleanup.php,build_archives.php}
    data/
      state.json
      clips/<legacy-clip-id>/...       <-- 舊版資料保持原位
      events/<event-id>/
        clips/<clip-id>/video.bin      <-- 新錄影每個 Event 獨立資料夾
        archives/<archive-id>-part-001.zip
```

如使用 `dataDir` 指向網站以外其他私人路徑，Event 子資料夾會建立喺嗰個 `dataDir` 底下；唔係硬性上面路徑。新版本沿用 `state.json` schema 1，新增 Event archive 狀態欄位；**唔會自動搬動舊 clip**，但新版本仍可按舊路徑存取佢哋。請勿以 v0.9.3 Cloud 程式直接覆蓋 v0.9.4 後新上傳嘅資料，因舊版唔識新 Event 影片路徑。

`retrobooth_private/config.php` 必須保留現有唯一強密鑰及真實網址。例如只列出需要核對的非秘密欄位：

```php
'publicOrigin' => 'https://YOUR-DOMAIN.EXAMPLE',
'dataDir' => __DIR__.'/data',
'quotaBytes' => 2147483648,
'maxArchiveBytes' => 2147483648,
'maxArchivePartBytes' => 134217728,
'corsOrigins' => ['https://appassets.androidplatform.net','retrobooth://app'],
```

如果現有 config 已有額外 CORS origins，**追加**而唔係直接刪掉。確保 Android Native Cloud approval 正確允許你嘅 Hostinger Origin。

### 開通真正 Guest QR

1. 瀏覽 `https://YOUR-DOMAIN/admin/`，用原有 Cloud Admin Key 登入。
2. Create Event（輸入名稱同保存日數）。可以喺 Cloud Admin 編輯 Event title、關閉新 QR、暫停 upload drain、管理 clips 同 device。
3. 按 **Create device bundle**，複製 JSON。佢係秘密資料，唔好發俾客人。
4. Android RetroBooth → Admin → **07 / PRIVATE CLOUD DELIVERY**，貼入 Device Bundle，按 **Verify + connect cloud**。
5. 畫面應顯示 `CONNECTED / Event: ... / 12 reserved QR links` 等字眼；如果係 `LOCAL-ONLY`，絕對唔好假設有有效 QR。
6. Admin → DEVICE CHECK 先 APPLY CAMERA，再 APPLY MICROPHONE，確認有畫面同聲音。
7. 做一段 10 秒 **REAL** 錄影（唔好用 DEMO），出現有效 QR。用第二部手機掃碼；測試 `Upload Pending` → `READY` → Download，影片必須有畫面與聲音。亦請確認 Cloud Admin 出現同一筆 ready clip。
8. 試埋 Android App 關閉再開、斷線後上傳重試、Guest 已刪片；正式活動前先在 staging 域名測試。

## 三、每個 Event 獨立資料夾

Event 新建會生成隨機 32 位 hex Event ID（唔係直接用 Event 名，避免改名、非法字元同重複名稱造成路徑混亂）。Cloud Admin 用 Event 名稱管理，真實路徑類似：

```text
retrobooth_private/data/events/19ac...8e4f/clips/a203...8d09/video.bin
```

所有 Clip ID 仍有原本嘅 Guest owner/viewer token、上傳核對及不可逆 Delete。Event title 可以改，但 Event ID 同原本影片關聯唔會變。**唔可以藉修改 Event 名將舊檔改派另一個 Event。**

## 四、活動完結：Share all videos by ZIP

1. 喺 Cloud Admin 揀返指定 Event，先 **Close NEW QR reservations**。
2. **保持 Upload Drain 開啟**，直到全部已拍攝影片都出現 `ready`，而唔係 `uploading` 或手機仍在 offline queue。留意已預留但尚未使用嘅 QR slot 唔等於已錄影。
3. 核實影片數同實際拍攝數一致，然後 **Pause upload drain**。
4. 喺 **Client delivery · Private ZIP archive**，按 **Prepare all ready videos**。系統要求明確確認：包含所有 ready 影片，**即使客人只係 Hide from slideshow，仍會包含喺客戶 ZIP**；已 Deleted 影片除外。請按活動訂單／同意聲明處理資料分享。
5. 狀態由 `QUEUED` → （CLI worker）`BUILDING` → `READY`。大型 Event 會分成多個獨立 ZIP，每個預設最多約 128 MiB；客戶每個 ZIP 都要分別下載，**唔係需要解壓合併嘅 multi-volume ZIP**。
6. 揀分享有效期（1/3/7/14/30 日，實際到期時間唔會超過 Event retention），按 **Create / Rotate client share link**，再 Copy Client Link 發俾客人。
7. 客戶打開 `https://YOUR-DOMAIN/client/index.html?token=...`，可以分別下載所有 ZIP。個網頁**唔會提供 Admin 權限**；客戶連結係無密碼但高熵秘密連結，請私下傳送。
8. **Revoke client link** 即時阻止新的認證／下載要求。重新 Create link 會換新 token，令上一條連結／下載 cookie 無效。已經完成嘅外部下載，技術上無法收回。
9. 如果 Event 新增 late upload 或有人刪除 ZIP 包含嘅影片，舊 ZIP 會變成 `STALE`、舊分享即時失效；需再次關閉 Event Upload，重建 ZIP 同發新連結。

### Hostinger Cron：自動建立 ZIP（必須設置）

從 Hostinger **Websites → Manage site → Advanced → Cron Jobs**，揀 **PHP**，Path 設到 `retrobooth_private/tools/build_archives.php` 嘅**絕對 filesystem 路徑**（必須在 public_html 以外）；建議每 5 分鐘執行一次。Cloud Admin 嘅 `Prepare` 只會建立 Queue，唔會喺 HTTP request 即時壓縮幾 GB 影片，避免 PHP request timeout。

如果用 SSH 手動測試（請按實際路徑替換，唔好直接照抄佔位符）：

```bash
php /home/<HOSTINGER_USER>/domains/<YOUR_DOMAIN>/retrobooth_private/tools/build_archives.php
```

Hostinger 官方 Cron 教學：<https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/>

如果狀態一直 `QUEUED`，檢查 Cron 真實檔案路徑、PHP CLI 版本、cron output、private folder 寫入權限同剩餘磁碟空間。`FAILED` 狀態可檢查 Admin 錯誤，再重試 Prepare。

## 五、重要限制及驗收

- 單條上傳仍有目前 64 MiB 限制；Event 片量／總量預設上限 2 GiB，可依 Hostinger storage 修改設定，但**ZIP 額外佔用接近影片本身容量**。
- ZIP 採 STORE（影片本身已有壓縮，重壓縮幫助不大），唔依賴 PHP `ZipArchive` extension。影片只喺私人 server-side folder；下載經 PHP 權限驗證同一小時有效嘅 HttpOnly cookie 授權（不超過分享／Event 到期日），每次新下載仍會檢查有冇被撤銷；時間過咗請重新打開原本 Client Share Link。
- Cloud Alpha 係單主機、本地先儲存、非高可用檔案庫；Hostinger Business Web Hosting 嘅高流量影片觀看能力及 ToS 應向 Hostinger 確認。大型／多人活動建議另外計劃 object storage 或適當影片服務。
- 分享前要有適當客人同意：Hidden 是「不公開上大屏」，**唔等於同意分享俾 Event Client**；全部下載屬於 Admin 主動動作。
- **不會自動搬舊 Android 本地影片**；活動前請做一次真實 Hostinger QR end-to-end Test。
- 更新 Android TEST APK 時使用**同一套 Test Keystore**。如果簽署不同或清除 App storage，舊本地影片可能無法保留。更新前另行匯出影片。
- 本地測試包括真實 PHP HTTP API、檔案 hash、ZIP 格式、撤銷／刪除流程；**未在你 Hostinger 實際環境及 Android 商用活動驗證**。無 native APK 或 EXE 直接包含喺 GitHub Source ZIP。
