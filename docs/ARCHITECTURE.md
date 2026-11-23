# v0.9 desktop architecture addition

Windows runs the same bundled renderer in a sandboxed Electron BrowserWindow at retrobooth://app, with no renderer Node access. A narrowly scoped preload supports cloud-origin approval, fullscreen, profile-location display and export notifications. Blob downloads use the native Save dialog. Only fixed local assets and one explicitly approved HTTPS /api/ origin are permitted. Installed and portable builds share a per-account profile; no automatic browser/Android media migration. Windows printing is not implemented.

The independent Android WebView and SPP implementation remain unchanged; native app IDs are platform-specific. Cloud remains the existing single-host private PHP service. See desktop/ for the implementation and the workflow for unexecuted native build/runtime gates.

## Retained v0.8 architecture notes

# RetroBooth v0.8 architecture

```
Webcam + mic -> existing processed canvas -> MediaRecorder -> local BrowserStore
                                                        |
                                              frozen per-clip QR
                                                /              
                          timed screen hand-off                 native Android ticket
                          existing idle cloud uploader          exact-origin message bridge
                                      |                         journal -> secure SPP -> printer
                           private PHP v0.7 API                 sent_unconfirmed, never paper-confirmed
                                      |
                           phone owner/view-only pages
```

Capture, cloud and printing are independent. The native QR request occurs only after the existing final local commit. Printer failure cannot erase the video. Cloud upload is idle-scheduled; QR links can be pre-reserved, so paper need not wait for completed upload. An exhausted link pool blocks cloud-mode capture unless the operator explicitly chooses local-only; local-only has no native guest ticket.

Browser and native authority are separate. The typed bridge only exists in the packaged main frame; native dialogs gate pinning, auto-send permission, explicit reprint and risky fast return. It cannot provide real staff authentication while the local Admin remains a gesture. The cloud device bundle and owner token must stay private; no cloud Admin key belongs in a QR.

The native journal keeps no playable media or raw capability URL. Deletion revokes local ticket eligibility when processed and cancels active transport; bytes already sent cannot be recalled. No change is made to other projects' photo-printer entitlement ledgers or H5 job formats.

Media durability remains the existing WebView IndexedDB limitation, not a native crash-proof recorder. The journal's fsync/atomic rename improves ticket idempotency but does not certify Android power-loss behavior. Optional faster hand-off is operator-accepted transport risk, not a paper-state detector.

The PHP backend and viewer implementation remain v0.7. Its health printer field reports not_connected because no server-to-Bluetooth service exists. Use native Admin status to inspect the local pinned connection.
