# v0.8 independent native QR-ticket contract

## Platform / trust
Only the bundled Android top frame at `https://appassets.androidplatform.net/assets/www/index.html` receives `RetroPrinterNative`. The cloud website has no native bridge. No `addJavascriptInterface`, arbitrary raw command bytes, arbitrary URL print or insecure RFCOMM fallback was added. The existing local Admin gesture is not authentication: a supervised device is still required.

Only already-bonded devices are listed. The operator pins the exact address in a native prompt. Android 12+ requests BLUETOOTH_CONNECT; the module does not scan, request location or use BLE. Secure SPP UUID `00001101-0000-1000-8000-00805f9b34fb`. No auto same-name handover or background reconnect.

## Job identity
Automatic job ID is the saved local clip ID. The exact immutable cloud guest URL must match its delivery snapshot. Source must be a non-deleted, non-interrupted real clip with readable local metadata, a cloud binding and QR receipt. Photo-only/local-only/demo sources cannot produce guest tickets.

Native validation independently restricts URLs to the approved canonical HTTPS origin, `/guest/`, a 32-hex clip key plus 32-character base64url capability fragment, printable ASCII and <=256 bytes. No userinfo/query/non-default port. A diagnostic QR has a fixed example.invalid path and is never a guest ticket. Unicode domains must use canonical ASCII/punycode; no user token is logged.

An intentional reprint requires a new job ID and parent original ID; its clip/URL/label/profile fingerprint must match the persisted original. A repeated job ID never sends twice, even after reconnect. No auto retry of any terminal record. New jobs cannot be queued behind an active send.

## Private journal and send state
`filesDir/qr-ticket-ledger-v1/`: process lock; one file per job; atomic same-directory replace, fsync file+directory. Journal corruption/locking/commit failure blocks printing, not resets it. Android filesystem behavior still needs device verification.

Persist `prepared` before transport; persist `sending` before first write. Successful writes and flush yield `sent_unconfirmed` only. A partial write, flush error or cancellation after intent yields `outcome_unknown`. Pre-send expiry yields `failed_before_send`. Restart turns unfinished prepared/sending into unknown; nothing is replayed. The cap is 9,999 jobs, with no automatic garbage collection.

The journal keeps immutable profile/IDs/label/device/connection/URL hash/fingerprint and mutable state, never the private URL/media bytes. URL bytes are re-derived from the selected saved clip and verified by hash for reprints. Revocation markers prevent later sends after a clip deletion has reached the adapter. Cancellation cannot recall printer-buffered bytes or physical copies.

## Native commands
Envelope `{id:32hex, op, ...}`; response `{id, version:1, data}` or `{id, version:1, error}`. Maximum input JSON 4096 characters. Permission, settings, list, pin, connect/disconnect, automatic, ledger, test, print, observe, fastOff, revoke and request-targeted cancel. No remote endpoint can invoke these commands directly.

Print parameters: jobId, clipId, exact payload, numeric label, parent, automatic, waitMs (1-15sec); automatic adds a short absolute deadline. Connect has an 8sec socket watchdog. Send has a hard-close watchdog plus per-chunk cancellation. Pause closes the socket and clears session permissions. A cancelled/late UI callback cannot switch the next guest QR or start a second transmission.

## Byte profile
`native-qr-model2-m-size4-v1`: initialize, center ASCII header/message number; native ESC/POS GS(k Model 2, 4-dot modules, M error correction; store exact ASCII URL bytes including fragment; print symbol; feed four lines; restore left alignment. No image raster, Chinese glyphs, custom designer captions, snapshot, logo, cut or undocumented status command. Native QR fit/quiet zone/firmware support are physical acceptance gates.

## QR skip is an explicit risk policy
Default keep QR. A connected socket or sent_unconfirmed alone cannot bypass. To opt in, an operator declares a complete scanned guest URL matching a sent_unconfirmed journal job on THIS pinned printer/connection, then accepts a native warning. This is manual observation, not attested scan hardware or electronic paper confirmation.

Acceptance is bounded by same origin/profile, maximum observed URL length, current connection epoch and four hours. Pause/disconnect/failure clears it. Bypass requires the real validated response, correct hash/clip/job, nonduplicate sent_unconfirmed and unexpired acceptance. Always-show-screen overrides it. The recorded job STILL says sent_unconfirmed. Paper-out or unreadable output can still occur, so unattended fast return is inappropriate.

## Limits / provenance
This is newly written RetroBooth code, not H5.3 source reuse. The full handoff reference was unavailable. Unit tests and fake-native browser tests do not certify Android Bluetooth permissions, SDK compilation, transport interoperability or physical paper. See TEST_REPORT.md and guide sections 12-16.
