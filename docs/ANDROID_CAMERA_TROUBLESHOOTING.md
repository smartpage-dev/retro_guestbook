# RetroBooth v0.9.1 — Android camera / microphone troubleshooting

## What changed

The Admin Device Check area now offers Camera and Microphone selectors, a front/rear/default direction when no camera ID is selected, independent camera-only and mic-only probes, and an actionable status line. Media tracks from each probe are stopped immediately. A combined camera+mic request retries once with basic constraints ONLY if both devices are on System default and the first request fails with NotReadableError, AbortError or OverconstrainedError. It never silently substitutes a specifically selected device. Real recordings still require BOTH active tracks and local storage.

## First Android test

1. Install a successful GitHub Actions Android TEST APK built from this source (versionCode 10), keeping the SAME signing key as your existing install. Do not uninstall/clear storage before exporting valuable clips.
2. In Android Settings > Apps > RetroBooth > Permissions, allow Camera and Microphone. Check the system-wide camera/microphone privacy toggles.
3. Close Camera, QR scanner, video-call, and other camera apps. Disconnect/reconnect USB webcam or mic if applicable. Restart RetroBooth.
4. Admin > 02 / Device Check > Refresh devices. Before permission, names may be blank. Choose System default for both; choose Front / selfie or Rear / back, or an explicit device when shown.
5. With the live camera OFF, run Test camera only. Check PASS/FAILED status. Then run Test microphone only. These tests DO NOT save video.
6. Press Apply camera + microphone. Verify the LIVE status and the mic meter in Camera Lab. Record one disposable 10-second clip, then check playback and download in Tape library.
7. If either isolated probe fails, export diagnostics and report Android model, Android version, WebView version, which probe failed, and exact status. Test the phone's stock Camera app independently.

## Limits

This is a source-level compatibility fix, NOT a verified repair on your specific phone. Some Android devices expose only one input, hide device labels until permission, or cannot use certain USB camera/mic combinations. Browser WebView and physical camera behavior require real-device acceptance. No silent video-only fallback is allowed. Windows camera selection also benefits from the same UI. Bluetooth printer and cloud code are unchanged.
