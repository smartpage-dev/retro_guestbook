# RetroBooth v0.9.6 GitHub version-fix patch

Unzip into the root of your existing GitHub repository (beside `package.json`).
The main fix is `desktop/package.json`; the workflows and `tools/check_release_versions.py` add early version checks to prevent repeat failures.
Run `python tools/check_release_versions.py` from repo root, then commit and push to main, and start a NEW Android APK workflow run.

Full Cantonese/English technical guide: `docs/GITHUB_RELEASE_VERSION_FIX_V096.md`.
