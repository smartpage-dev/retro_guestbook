# Official platform references

Checked 23 November 2026. These describe platform APIs, not hardware certification of RetroBooth.

- GitHub manual workflow, default-branch requirement: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- GitHub artifact download: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts
- Android signing and update identity: https://developer.android.com/studio/publish/app-signing
- AGP 8.9 compatibility (Gradle 8.11.1 / JDK17): https://developer.android.com/build/releases/past-releases/agp-8-9-0-release-notes
- Electron release index (45.4.1 pinned): https://releases.electronjs.org/
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron session / permission APIs: https://www.electronjs.org/docs/latest/api/session
- Electron custom protocol: https://www.electronjs.org/docs/latest/api/protocol
- Electron navigation / WebContents: https://www.electronjs.org/docs/latest/api/web-contents
- Electron downloads: https://www.electronjs.org/docs/latest/api/download-item
- electron-builder stable 26.18.0: https://github.com/electron-userland/electron-builder/releases/tag/electron-builder%4026.18.0
- Stable v26 NSIS and portable targets: https://www.electron.build/v26/docs/nsis/

Application claims and exact test evidence belong in TEST_REPORT.md. Runtime package installation/compilation was not possible in the authoring container due unavailable toolchains and registry DNS; GitHub native jobs remain required.
