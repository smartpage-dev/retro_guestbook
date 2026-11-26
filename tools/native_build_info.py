"""Write Android artifact metadata using the actual Gradle version rather than a stale literal."""
from pathlib import Path
import json, os, re
info=json.loads(Path('dist/BUILD_INFO.json').read_text(encoding='utf8'))
gradle=Path('android/app/build.gradle').read_text(encoding='utf8')
match=re.search(r'(?m)^\s*versionCode\s+(\d+)\s*$',gradle)
if not match:raise SystemExit('Missing Android Gradle versionCode; stop rather than mislabel artifact')
info.update(platform='android-webview-spp-qr-pilot',versionCode=int(match.group(1)),applicationId='studio.luce.retrobooth.preview',signing=os.environ.get('SIGNING_MODE','unknown'),release_outputs='UNSIGNED - not directly installable / not store ready',device_acceptance='NOT RUN by this workflow',warning='Uninstall or Clear storage erases local clips. Export first. Ephemeral debug keys can differ between builds.')
Path('native-artifacts').mkdir(exist_ok=True)
Path('native-artifacts/BUILD_INFO.json').write_text(json.dumps(info,indent=2)+'\n',encoding='utf8')
