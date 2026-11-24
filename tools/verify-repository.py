"""Dependency-free repository shape/version and workflow contract checks."""
from pathlib import Path
import json, re
R=Path(__file__).resolve().parents[1]
required=['.github/workflows/build-all.yml','desktop/main.cjs','desktop/package.json','desktop/electron-builder.cjs','desktop/resources/icon.ico','android/app/build.gradle','tools/run-desktop-smoke.mjs','tools/collect-windows.mjs','tools/install-desktop.mjs','docs/WINDOWS_QUICK_START.md','docs/ANDROID_QUICK_START.md']
for name in required:
 assert (R/name).is_file(),name
p=json.loads((R/'package.json').read_text());d=json.loads((R/'desktop/package.json').read_text())
assert p['version']==d['version']==(R/'VERSION.txt').read_text().splitlines()[0]
g=(R/'android/app/build.gradle').read_text();assert f"versionName '{p['version']}'" in g
w=(R/'.github/workflows/build-all.yml').read_text()
for text in ['workflow_dispatch:','windows-2022','assembleDebug','lintDebug','apksigner','package:win:','run-desktop-smoke.mjs desktop/release/win-unpacked/RetroBooth.exe','if-no-files-found: error','tests/real_origin.py --require-origin','tests/cloud_real_origin.py']:
 assert text in w,text
assert not re.search(r'continue-on-error:\s*true',w)
assert 'retrobooth://app' in (R/'cloud/retrobooth_private/config.example.php').read_text()
print('Repository shape and build-gate contracts passed (not native compilation).')
