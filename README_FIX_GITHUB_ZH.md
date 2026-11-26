# RetroBooth v0.9.6 — Android Build missing source script 修復

## Log 證據
- 來源：`logs_123925046703(1).zip`；GitHub checkout commit `53f5debac28b5da29a997134b81c266b9e8f5ca8`，2026-11-26 10:45 UTC。
- `Repository preflight and fast source checks` 階段，`python tools/check_release_versions.py` 提示 `[Errno 2] No such file or directory`。
- APK Gradle 編譯尚未開始；今次問題與 Camera、CRT、QR/Receipt Printer 無直接關係。

## 今次 PATCH 包含
- `tools/check_release_versions.py`：**與已交付 v0.9.6 完整 Repository 版本逐 byte 相同**，SHA-256：`43fd8fe094ce0c2f634c2a677dc32b0874b2a0fc66e8a25a2be81942bece1e90`。
- `README_FIX_GITHUB_ZH.md`：本說明。

## 最簡單修復方法（GitHub Desktop）
1. 將此 ZIP 解壓。
2. 把入面 `tools/check_release_versions.py` 複製到本地 `retro_guestbook/tools/check_release_versions.py`。**唔好放進 `tools/tools/`，亦唔好直接將 ZIP 當作檔案上載。**
3. 開 GitHub Desktop，喺 Changes 應該見到 `tools/check_release_versions.py` 新增檔案。
4. Commit：「Restore release version checker for Android CI」，然後 **Push origin** 到 `main`。
5. 去 GitHub 網站 `Code → main → tools/check_release_versions.py`，確認可以直接開啟 Python 原始碼。
6. `Actions → RetroBooth - Build Android APK → Run workflow` 啟動 **全新** Run。唔好 Re-run 舊 Run。

## 執行前檢查（可選，在 Repository 根目錄）
```bash
python tools/check_release_versions.py
git ls-files --error-unmatch tools/check_release_versions.py
```

預期版本：`package.json`、`desktop/package.json`、`VERSION.txt`、`android/app/build.gradle` **全部 `0.9.6-alpha.1`**。

如果 `git ls-files` 仍表示找不到檔案，代表未有 Git Commit；如果 `git status` 顯示 ignored，需要檢查 Git ignore 設定（完整 v0.9.6 原版 `.gitignore` 並冇忽略呢個檔案）。

## 驗證範圍
- 腳本係原版 v0.9.6，未做功能邏輯修改。
- 已喺隔離環境確認四個版本欄位相同時成功；刻意將 Desktop 版本改成 `0.9.5-alpha.1` 時正確拒絕。
- 未登入／修改你嘅 GitHub Repository，亦未完成 Android 原生編譯；需要 Commit、Push 後由 GitHub 新 Run 驗證。
