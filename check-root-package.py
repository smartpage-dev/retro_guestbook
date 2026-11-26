#!/usr/bin/env python3
"""RetroBooth root package and source check; no dependencies or network."""
from pathlib import Path
import json
import sys

root = Path(__file__).resolve().parents[1]
errors = []
try:
    pkg = json.loads((root / 'package.json').read_text(encoding='utf-8'))
except (FileNotFoundError, json.JSONDecodeError) as exc:
    print('FAIL: Repository root package.json is unreadable:', exc)
    sys.exit(1)

expected = {
    'desktop:prepare': 'node tools/prepare-desktop.mjs',
    'android:assets': 'node tools/build.mjs',
    'test:native-core': 'python tools/test_native_core.py',
}
scripts = pkg.get('scripts', {})
for key, command in expected.items():
    if scripts.get(key) != command:
        errors.append(f'root package.json scripts.{key}: expected {command!r}, found {scripts.get(key)!r}')
if not isinstance(scripts.get('test'), str) or not scripts['test'].strip():
    errors.append('root package.json is missing the test script')
if pkg.get('name') != 'luce-retrobooth':
    errors.append(f'root package.json name is {pkg.get("name")!r}, expected luce-retrobooth')
if pkg.get('version') != '0.9.6-alpha.1':
    errors.append(f'root package.json version is {pkg.get("version")!r}, expected 0.9.6-alpha.1')
for rel in [
    'src/.htaccess', 'src/desktop-admin.html', 'tools/prepare-desktop.mjs',
    'tools/build.mjs', 'tools/test_native_core.py', 'android/app/build.gradle',
    '.github/workflows/build-android.yml', '.github/workflows/build-windows.yml',
    '.github/workflows/verify-all.yml',
]:
    if not (root / rel).is_file():
        errors.append(f'missing required source file: {rel}')
if (root / '.github/workflows/build-all.yml').exists():
    errors.append('obsolete .github/workflows/build-all.yml is still present')
if errors:
    print(f'FAIL: {len(errors)} repository checks failed:')
    for e in errors:
        print(' - ' + e)
    print('Restore the v0.9.6 complete repository root; do not copy desktop/package.json to root.')
    sys.exit(1)
print('PASS: RetroBooth v0.9.6 root package scripts and required files are present.')
