@echo off
setlocal
echo RetroBooth v0.9.6 - Verified source sync to GitHub Desktop repo
echo Please CLOSE GitHub Desktop changes window if files are being refreshed.
echo This tool will NOT commit or push anything.
echo Before continuing, use GitHub Desktop: Fetch origin, Pull latest main, and ensure no uncommitted changes.
set /p REPO=Paste your existing retro_guestbook clone folder path: 
set "REPO=%REPO:"=%"
if "%REPO%"=="" (echo No path. & pause & exit /b 1)
where node >nul 2>&1
if errorlevel 1 (echo Node.js 22 or newer is required. & pause & exit /b 1)
node "%~dp0tools\sync-release-to-repo.mjs" --repo "%REPO%" --dry-run
if errorlevel 1 (echo Safety check failed - no files copied. & pause & exit /b 1)
echo.
node "%~dp0tools\sync-release-to-repo.mjs" --repo "%REPO%" --apply
if errorlevel 1 (echo Sync failed. Do NOT push. & pause & exit /b 1)
echo.
echo Finished: review changed files and then Commit and Push in GitHub Desktop.
pause
