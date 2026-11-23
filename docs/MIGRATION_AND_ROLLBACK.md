# v0.8 migration and rollback

## Preserved
Original v0.7 ZIP/HTML are not overwritten. Browser DB `luce-retrobooth-prototype-v05`, schema and Android application ID `studio.luce.retrobooth.preview` remain. Android versionCode is 8. No old video is rewritten, enrolled into cloud or printed by upgrade. v0.7 PHP API/storage stays byte-identical.

Optional clip `printTicket` metadata is additive; native deduplication uses its own hash-only journal. The dedicated printer address is a native preference. Automatic permission/fast-return acceptance are session-memory only and start OFF. Reconnect explicitly; no startup replay.

## Before upgrade
Export and verify important videos; finish/record cloud jobs and deletion acknowledgements; close old tabs. Use the same browser origin or Android signing identity. Different signatures may require a deliberate migration: do NOT fix it by uninstalling first. Never publish cloud configuration or guest owner QR links to GitHub.

## Rollback to v0.7
Stop capture, disconnect printer, export recordings. Restore the tagged source while keeping all browser data, cloud private state and the native journal. v0.7 does not operate the new printer; it can continue its existing cloud protocol. A rollback Android build may need a higher versionCode with the same key rather than an unsafe forced downgrade. The v0.8 native journal must remain for any future return to v0.8; deleting it loses duplicate protection.

Rolling back further to v0.6 removes cloud processing. Drain uploads and deletion acknowledgements and deliberately retire credentials first. It cannot undo server deletion. Do not restore stale cloud metadata over newer deletion tombstones.

## Maintenance
Journal corruption, failed atomic commit, full 9,999-entry ledger or native revocation failure needs staff review. Keep screen QR and disconnect. This release does not provide a native journal export/compaction UI or safe in-place reset. Do not delete files or clear app storage to recover: media, credentials and idempotency may be lost. No background automatic ticket retry is implemented.
