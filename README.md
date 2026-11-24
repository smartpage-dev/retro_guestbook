# RetroBooth v0.9 — source-file repair for GitHub run 45316059043

GitHub Actions failed in `npm run desktop:prepare` because `src/desktop-admin.html` was absent in commit `fd61523352b049fb96013c4b1c0bb84ce888ee04` on `main`.

This archive contains the unchanged `src/desktop-admin.html` from the previously delivered COMPLETE_REPO_ROOT source, plus an optional `tools/check-required-source.py` preflight helper. It does **not** change the application logic, workflow, credentials, cloud data or signing settings.

1. Open your local `retro_guestbook` repository in GitHub Desktop. Copy the two included folders **into the repository root** so `src/desktop-admin.html` exists next to the other `src/*.html` files.
2. Run `python tools/check-required-source.py`, then `npm run desktop:prepare` locally if Node.js 22+ is available.
3. Confirm `git status` shows `src/desktop-admin.html` as a new or modified tracked file. Commit and push to `main`.
4. In GitHub **Code** tab, check `src/desktop-admin.html` exists in `main`. Only then run Actions > RetroBooth - Build APK and Windows EXE > Run workflow.

If other required files are missing, use the earlier COMPLETE_REPO_ROOT ZIP instead of fixing one by one. Never overwrite project changes or cloud secrets without review.
