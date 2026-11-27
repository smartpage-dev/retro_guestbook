"""Check RetroBooth v0.9.7 repository shape and three independent workflows.
This is a source-contract check, not proof of native compilation.
"""
from pathlib import Path
import json, re
R = Path(__file__).resolve().parents[1]
required = [
    '.github/workflows/build-android.yml',
    '.github/workflows/build-windows.yml',
    '.github/workflows/verify-all.yml',
    '.github/workflows/source-preflight.yml',
    'tools/check-release-integrity.mjs', 'tools/sync-release-to-repo.mjs',
    'tools/verify_apk_badging.py', 'tests/test_apk_metadata.py',
    'RELEASE_SOURCE_SHA256.json', 'SYNC_TO_GITHUB.cmd',
    'src/.htaccess', 'src/desktop-admin.html', 'src/diagnostics.js', 'tests/diagnostics.test.cjs',
    'cloud/public_html/show/index.html','cloud/public_html/assets/show.js','cloud/public_html/assets/admin.js',
    'docs/CLOUD_EVENT_MASTER_V097_ZH.md','tests/browser_v097_styles.py','tests/browser_v097_cloud_mock.py','tools/package_cloud_update.py',
    'tests/media_separation.test.cjs','tests/browser_v093_separated.py','docs/ANDROID_MEDIA_V093.md',
    'tests/browser_v094_style_fit.py','docs/MODERN_CRT_V094.md',
    'tests/browser_v096_receipt_printer.py','docs/RECEIPT_PRINT_V096_ZH.md','src/ticket-photo.js',
    'tools/prepare-desktop.mjs',
    'desktop/main.cjs', 'desktop/package.json',
    'desktop/electron-builder.cjs', 'desktop/resources/icon.ico',
    'android/app/build.gradle', 'tools/run-desktop-smoke.mjs',
    'tools/collect-windows.mjs', 'tools/install-desktop.mjs',
    'docs/WINDOWS_QUICK_START.md', 'docs/ANDROID_QUICK_START.md'
]
for name in required:
    assert (R / name).is_file(), f'Missing required source: {name}'
p = json.loads((R/'package.json').read_text())
d = json.loads((R/'desktop/package.json').read_text())
assert p['version'] == d['version'] == (R/'VERSION.txt').read_text().splitlines()[0]
g = (R/'android/app/build.gradle').read_text()
assert f"versionName '{p['version']}'" in g
android = (R/'.github/workflows/build-android.yml').read_text()
windows = (R/'.github/workflows/build-windows.yml').read_text()
verify = (R/'.github/workflows/verify-all.yml').read_text()
for label, text, tokens in [
    ('Android', android, ['workflow_dispatch:', 'ubuntu-24.04', 'assembleDebug', 'lintDebug', 'apksigner', 'test:native-core', 'if-no-files-found: error']),
    ('Windows', windows, ['workflow_dispatch:', 'windows-2022', 'package:win:', 'run-desktop-smoke.mjs desktop/release/win-unpacked/RetroBooth.exe', 'if-no-files-found: error']),
    ('Verify', verify, ['workflow_dispatch:', 'timeout-minutes: 75', 'tests/real_origin.py --require-origin', 'tests/cloud_real_origin.py', 'python tests/run_suite.py']),
]:
    for token in tokens:
        assert token in text, f'{label}: missing {token}'
    assert not re.search(r'continue-on-error:\s*true', text), f'{label}: test bypass forbidden'
    assert '    needs: verify' not in text, f'{label}: platform build should not depend on shared Verify'
assert 'python tools/verify_apk_badging.py native-artifacts/APK_INFO.txt' in android, 'APK version verification must compare signed artifact with Gradle'
assert 'grep "versionCode=' not in android, 'Do not hardcode obsolete Android versionCode in workflow'
assert 'versionCode 16' in (R/'docs/ANDROID_QUICK_START.md').read_text(), 'Current Android quick start must say versionCode 16'
assert 'push:' in (R/'.github/workflows/source-preflight.yml').read_text(), 'Fast source preflight must run on push.'
for wf in ['build-android.yml', 'build-windows.yml', 'verify-all.yml', 'source-preflight.yml']:
    assert 'check-release-integrity.mjs --require-git' in (R/'.github/workflows'/wf).read_text(), f'Integrity guard missing: {wf}'
assert 'retrobooth://app' in (R/'cloud/retrobooth_private/config.example.php').read_text()
assert not (R/'.github/workflows/build-all.yml').exists(), 'Remove legacy combined workflow to avoid duplicate/confusing builds.'
print('Independent Android, Windows, Full Verify, and automatic Fast Source Preflight contracts passed (not native compilation).')
