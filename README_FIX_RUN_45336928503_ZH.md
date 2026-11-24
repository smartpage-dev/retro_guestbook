# RetroBooth v0.9 — GitHub Verify timeout / Run 45336928503

## Diagnosis from the uploaded logs
- Run 45336928503 checked out commit `5e94731c86099afcfb35a0564a714337b4b487ff`.
- Verify started at 2026-11-24 05:57:43 UTC and was cancelled at 06:27:55 UTC (about 30 minutes).
- PHP HTTP tests completed: 84 passed. Playwright Chromium download completed.
- Browser groups up to `browser_v08-native-flow` returned exit 0. `browser_v08-deadline-manual` began and was interrupted after ~2 seconds. This is NOT evidence that the test failed.
- No Android or Windows native build ran because both jobs depend on Verify.

## Likely cause and uncertainty
The original v0.9 workflow has `jobs.verify.timeout-minutes: 30`. The previously supplied repair changes it to 75. A cancellation almost exactly 30 minutes after job start is consistent with the original timeout still being active. The log does not explicitly state the cancellation initiator, so an external manual/automation cancellation cannot be fully excluded.

## Fix
1. Back up your current `.github/workflows/build-all.yml` and review differences.
2. Copy the included `.github/workflows/build-all.yml` into the ROOT of your local GitHub repository. It retains the existing Android/Windows jobs, all required browser tests, and previous apt retries, and sets Verify to 75 minutes.
3. Commit and push to `main`. In GitHub **Code > main > .github/workflows/build-all.yml**, verify `jobs: > verify: > timeout-minutes: 75`.
4. Start a **new** Actions workflow run (not Re-run of the old run). Confirm the new run checks out a **different** commit than `5e94731c86099afcfb35a0564a714337b4b487ff`.
5. In Verify logs, look for `Confirm v0.9 Verify timeout patch is in this checkout` and `Verify job timeout in committed workflow: 75 minutes`.
6. Leave Android + Windows x64 enabled; ARM64 optional. Download APK/EXE only from successful native build job Artifacts, not Test-Evidence.

## If it still cancels around 30 minutes
Inspect the GitHub run header and organization/repository policies for manual cancellation, workflow concurrency, or enforced limits. Download fresh logs and report the new commit and elapsed time. Do not disable required tests to make the job green.

## Scope
This patch changes only GitHub CI configuration. No application, printer, cloud, camera, signing, or media files are modified. This patch has been syntax-parsed locally but NOT executed on GitHub. No APK/EXE is produced by this patch ZIP.
