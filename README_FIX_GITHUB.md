# RetroBooth v0.9.6 GitHub root package.json fix

## What the November 26 Android build log proves

The runner checked out `main` commit `5c652337414d3cd82bdfa0e24301e82ae9cbd25d` and confirmed the four source files were Git-tracked, but stopped at:

`npm error Missing script: "desktop:prepare"`

This is a **repository root package.json** problem, not a QR printing or native Android compile error. The expected v0.9.6 root package.json has the missing script.

## Exact install

1. In GitHub Desktop, open the cloned `smartpage-dev/retro_guestbook` repository on branch `main`.
2. Back up the existing ROOT `package.json` for comparison.
3. Extract this ZIP into the repository root so it replaces only the ROOT `package.json` and adds `tools/check-root-package.py`.
4. DO NOT overwrite `desktop/package.json` with this root file. They are intentionally different.
5. In the repository root run: `python tools/check-root-package.py` (on some Windows installations use `py -3 tools/check-root-package.py`).
6. Optional full preflight: `npm run desktop:prepare` and `npm test`.
7. Review GitHub Desktop changes; commit and push the two files to **main**.
8. Inspect GitHub Code > package.json (NOT desktop/package.json); check that `scripts.desktop:prepare` is present.
9. Actions > **RetroBooth - Build Android APK** > **Run workflow** as a **new run**. Do not re-run a prior commit.

If other missing-file errors remain, restore the complete v0.9.6 repository root archive instead of patching files one by one.

## Scope / verification

This patch changes build metadata and a local checker only: no UI, camera, CRT, ticket, cloud, or printing logic. A freshly extracted v0.9.6 repository passed `npm run desktop:prepare`, `npm test` (46 desktop assertions plus other tests), `npm run test:native-core` (85 JVM assertions) and `python tools/verify-repository.py`. The exact GitHub repository's current package.json was NOT available in the uploaded log, so this fix remains to be verified by a new GitHub run. No native APK was compiled here.
