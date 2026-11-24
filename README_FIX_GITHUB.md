# RetroBooth v0.9 — GitHub dotfile repair (Run 45316384369)

## Diagnosis from actual GitHub Actions log

`npm run desktop:prepare` now finds `tools/prepare-desktop.mjs` and `src/desktop-admin.html`, but fails at `tools/build.mjs:18` because **`src/.htaccess` is absent** from GitHub checkout. The run checked out commit `6e1481c0a19fe2538954c7390c2c186a61bb7c5e` on `main`. This is not an Android or Electron compiler failure; those jobs did not start.

## Apply without losing local changes

1. Back up your working GitHub repository first. Extract this ZIP outside the repository.
2. Copy `src/.htaccess` into your repository's `src/` directory. Also check/restore `cloud/public_html/.htaccess`, `cloud/retrobooth_private/.htaccess` and `.gitattributes`. Do **not** blindly overwrite a customized `.gitignore`; compare it first.
3. Copy `check-github-source.py` and `source-required-sha256.json` to the repository root. The manifest lists all 109+ build/test source paths in the supplied v0.9 baseline; the checker verifies presence and Git tracking, not byte-identical source content.
4. In repository root run `python check-github-source.py` (or `py -3 check-github-source.py` on Windows). Repair every `MISSING` and `NOT COMMITTED` item. If the checker lists other source files, restore them from `RetroBooth_v0.9_COMPLETE_REPO_ROOT.zip`, not from unknown downloads.
5. `git add -f src/.htaccess cloud/public_html/.htaccess cloud/retrobooth_private/.htaccess` only if necessary; normally plain `git add` is enough. `git add .gitattributes check-github-source.py source-required-sha256.json`, then commit and push to `main`.
6. On GitHub **Code → main → src**, confirm `.htaccess` exists. Check the new commit hash differs from `6e1481c0a19f`. Start a **new** Actions run on `main` (do not rerun an old commit).

GitHub's web upload and some file managers may hide dot-prefixed files. The original v0.9 complete root ZIP **does contain** `src/.htaccess`, so this repair does not alter application behavior. The cloud `.htaccess` files protect server paths: do not remove them as a workaround.

The log ends before APK/EXE build. Passing this preflight does not certify native builds, real camera or physical QR printing.
