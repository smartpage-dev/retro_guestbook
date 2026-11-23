# v0.9 additional Windows host adapter

RetroDesktop in desktop/preload.cjs is deliberately separate from the Android printer/export bridge. It exposes info, authorizeCloud, fullscreen, storageLocation and event subscriptions only. The main process validates the exact bundled main frame and requires idle Admin for host changes. Native Windows exports use will-download with allowed Blob origin/filename/size and a Save dialog. No Windows Bluetooth, serial, USB or RAW printer adapter is introduced.

## Retained Android and cloud map

# Actual v0.7 -> v0.8 adapter map

| Existing surface | Change |
|---|---|
| `src/app.js` | Setup printer UI; block Start/navigation during native staff actions; show ticket status without replacing capture/save semantics. |
| `src/delivery-flow.js` | After final local save, use the frozen clip QR in a bounded native attempt. Existing demo branch stays separate. No native device in Chrome. |
| `src/delivery-policy.js` | Safe screen fallback. Optional validated native transport acceptance is distinct from physical confirmation; always-screen policy overrides. |
| `src/printer-client.js` (new) | Strict typed WebMessage RPC, saved real-clip/URL checks, per-request timeout and targeted cancellation, result identity/hash validation. |
| `src/printer-flow.js`, `printer-admin.html`, `printer.css` (new) | Dedicated-device setup, manual selected-history printing, explicit reprint, native auto opt-in, risk acceptance and hash-only journal UI. |
| `src/experience.js` | Clip deletion notifies native revocation; pending failure is exposed rather than claiming paper recall. |
| `NativePrinter.java` (new) | Paired-address pinning, runtime CONNECT permission, secure RFCOMM, native prompts, single worker, connection/send watchdogs and lifecycle cancellation. |
| `printing/*.java` (new) | Pure Java exact-URL QR encoding, durable hash-only journal, deduplication/reprint state, cancel/revocation, connection-bound fast return policy. |
| `MainActivity.java` | Exact bundled top-frame printer message channel and permission/lifecycle forwarding. Existing media/cloud/export bridges retained. |
| Android manifest / app Gradle | Add CONNECT plus legacy BLUETOOTH, no scan/location. Optional Bluetooth hardware. Same App ID; versionCode 8. |
| Build/package/CI | Include new modules, JVM journal test, native lint job, v0.8 outputs; no deployment. setup-gradle caching disabled. |

## Preserved boundaries
The webcam renderer, colour effects, recorder, receipt artwork, database/schema, PHP API/storage and guest privacy protocol are not replaced. Existing external photo-print systems and the H5 nine-field format are not touched. Camera and paper receipt layout remain independent: native v0.8 sends only its bounded QR profile, not the PNG receipt.

Source baseline: the actual mounted `RetroBooth_v0.7_GitHub_Ready.zip`. The inaccessible H5.3 archive is NOT a source baseline for the implementation. See REFERENCE_REVIEW.md and SOURCE_PROVENANCE.json.
