# v0.9.4 — Guest QR honesty, event storage, organiser ZIP delivery

- Fixed unconfigured real-camera recordings displaying QR patterns containing a non-URL prototype marker. Local-only real recordings now show a clear warning and no QR picture. **Demo** mode retains a plainly labelled test QR, not a download URL.
- Existing successful Android v0.9.3 independent camera and microphone logic left unchanged, Android versionCode incremented from 12 to 13 and shared app ID retained.
- Hostinger admin: create / rename / select events, manage devices and verified clips, close QR reservations and upload drain separately, queue verified all-videos ZIP snapshot, view status, generate/rotate/revoke private client links.
- New per-event private `data/events/<id>/clips/<id>/video.bin`; old v0.9.3 flat clip directories remain readable and are **not automatically relocated**.
- Private PHP CLI ZIP worker creates one or more independently extractable parts (STORE format) for original MP4/WEBM, SHA256-checks each source, and embeds a manifest. Requires Hostinger Cron (not performed by a browser request). Default event archive cap ~2 GiB, 128 MiB per ZIP part, up to 1000 videos.
- Client `/client/index.html?token=...` displays private ZIP downloads; bearer token removed from visible URL; HttpOnly cookie scoped only to ZIP paths (1-hour or earlier event/share expiry), revoked link invalidates future download requests. No Admin credentials shared.
- Guest deletion or newly verified late video makes an old all-videos snapshot stale, revokes link and clears ZIP files; explicit new Prepare required. Hidden/slideshow-private videos are still included in intentionally prepared all-ready snapshot.
- Scoped Linux HTTP, mock-browser and test-core checks passed. No physical device or hosting production acceptance.
