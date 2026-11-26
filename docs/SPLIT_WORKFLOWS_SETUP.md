> **Historical v0.9 split instructions.** For the current v0.9.6 GitHub sync, use [ONE_TIME_GITHUB_SOURCE_SYNC_ZH.md](ONE_TIME_GITHUB_SOURCE_SYNC_ZH.md), which includes the automatic Source Preflight and canonical integrity ledger. The artifact names below refer to the older v0.9 baseline.

# RetroBooth v0.9 — Independent GitHub Actions workflows

This update **splits the v0.9 combined GitHub workflow**. It does **not** change the camera, CRT effects, cloud API, Android Bluetooth SPP module or Windows application code.

## Install into an existing GitHub repository

1. **Back up or branch** the current repository. Make sure the complete v0.9 source is already committed at repository root (`src/`, `android/`, `desktop/`, `tools/`, `package.json`).
2. Copy the supplied `.github/workflows/` directory and `tools/verify-repository.py` into the **repository root**. Include hidden `.github` files.
3. **Delete** `.github/workflows/build-all.yml` from the repository; otherwise the old combined workflow remains visible.
4. Run `python tools/verify-repository.py`, then `npm run desktop:prepare` and `npm test` if Node 22 is installed. Do not upload deployment credentials, keystores or recorded videos.
5. Commit and push to the **default branch** (usually `main`). **Start a new workflow run**, not a rerun of an older commit.
6. Open GitHub **Actions**. Select one of:
   - `RetroBooth - Build Android APK`
   - `RetroBooth - Build Windows EXE`
   - `RetroBooth - Full Verification`

## Expected outputs (only after the corresponding GitHub job succeeds)

| Workflow | Artifact | Contents |
|---|---|---|
| Android APK | `RetroBooth-Android-APK-v0.9-RUN` | Signed-for-test `RetroBooth-v0.9-Android-TEST.apk` |
| Android APK | `RetroBooth-UNSIGNED-DEVELOPER-FILES-v0.9-RUN` | Unsigned release APK/AAB; not installable as delivered |
| Windows EXE | `RetroBooth-Windows-x64-EXE-v0.9-RUN` | Windows x64 Setup and Portable EXE |
| Windows EXE (optional) | `RetroBooth-Windows-arm64-EXE-v0.9-RUN` | ARM64 Setup/Portable EXE, untested on ARM64 hardware |
| Full Verification | `RetroBooth-Web-v0.9-RUN` | Web/Hostinger packages, plus separate test evidence |

**Key distinction:** Native builds no longer wait for the long shared Verify job. Each native workflow still runs fast source checks and platform-specific build/smoke/lint steps. The **complete** browser + PHP + true-origin test suite is retained in the independent Full Verification workflow and must pass separately before event use. Passing a build alone is **not** production readiness.

## Known limits

- The APK and EXE are **not precompiled in this ZIP**. GitHub runner needs network access and platform toolchains. No native GitHub run is claimed here.
- Windows EXE: **no Bluetooth/USB printing**. Android APK: secure-SPP QR-only pilot; paper output remains hardware-unverified.
- Android signing: use the existing `RETRO_TEST_*` GitHub secrets for stable upgrades. Temporary debug signing may change between builds; export local recordings before reinstalling.
- Windows EXE builds are unsigned; SmartScreen may warn. Each device keeps its own local clips and cloud device identity.
- Keep the cloud/private files and keys out of GitHub. Splitting workflows does not deploy Hostinger.
- If a workflow is missing from Actions, verify its `.yml` file exists on the **default branch**, under `.github/workflows/` (not inside an extra `RetroBooth/` folder).
- GitHub runners might fail on registry/mirror/network downloads. Inspect the exact failed job; do not disable required tests and claim acceptance.
