"""Check RetroBooth v0.9.1 repository shape and three independent workflows.
This is a source-contract check, not proof of native compilation.
"""
from pathlib import Path
import json, re
R = Path(__file__).resolve().parents[1]
required = [
    '.github/workflows/build-android.yml',
    '.github/workflows/build-windows.yml',
    '.github/workflows/verify-all.yml',
    'src/.htaccess', 'src/desktop-admin.html', 'src/diagnostics.js', 'tests/diagnostics.test.cjs',
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
assert 'retrobooth://app' in (R/'cloud/retrobooth_private/config.example.php').read_text()
assert not (R/'.github/workflows/build-all.yml').exists(), 'Remove legacy combined workflow to avoid duplicate/confusing builds.'
print('Independent Android, Windows and Full Verify workflow contracts passed (not native compilation).')
