# Reference access and implementation scope

The supplied COPY_TO_OTHER_PROJECT_ZH.txt was read. Its requirements to preserve capture workflows, use a dedicated pinned printer, print the selected guest link, persist a ticket before sending, avoid unknown-outcome automatic reprints, and separate SPP from Web Bluetooth are reflected in this build.

The exact known Library archive `Luce_QR_Ticket_Integration_Handoff_v2.0.zip` was requested through the authorized materialization tool again. It returned: **This Project file does not have an authorized raw-byte materialization path.** No access-control workaround was used. Consequently docs/TECHNICAL_SPEC.md, docs/ADAPTER_MAP.md, reference_h53/README.md and tests/ACCEPTANCE_CHECKLIST.md inside that archive were NOT inspected in this turn. No H5.3 port, byte parity or inherited hardware validation is claimed.

The accessible actual source baseline is RetroBooth_v0.7_GitHub_Ready.zip. This release adds an independently authored native adapter against that source and documented Android/Epson interfaces. Native snapshot printing and the H5.3-specific compatibility profile remain separate work.

## External primary references, checked 23 November 2026
- https://developer.android.com/develop/connectivity/bluetooth/bt-permissions : Android 12+ CONNECT runtime permission and legacy declarations.
- https://developer.android.com/develop/connectivity/bluetooth/connect-bluetooth-devices : secure RFCOMM socket and worker behavior.
- https://developer.android.com/reference/android/bluetooth/BluetoothSocket : blocking socket operations and close.
- https://developer.android.com/reference/androidx/webkit/WebViewCompat : main-frame/origin-aware WebMessage listener.
- https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lparen_k.html : QR Model 2/module/error correction/store/print commands.
- https://github.com/gradle/actions/releases/tag/v6.0.0 : caching component separate license; workflow explicitly disables caching.
- https://docs.github.com/en/actions/tutorials/build-and-test-code/java-with-gradle : build workflow operation; no claim this repository was run on GitHub.

These documents define APIs, not printer-specific certification. Consult the actual printer vendor manual and physical test results before event use.
