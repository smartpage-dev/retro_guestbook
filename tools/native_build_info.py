from pathlib import Path
import json,os
info=json.loads(Path('dist/BUILD_INFO.json').read_text())
info.update(platform='android-webview-spp-qr-pilot',versionCode=14,applicationId='studio.luce.retrobooth.preview',signing=os.environ.get('SIGNING_MODE','unknown'),release_outputs='UNSIGNED - not directly installable / not store ready',device_acceptance='NOT RUN by this workflow',warning='Uninstall or Clear storage erases local clips. Export first. Ephemeral debug keys can differ between builds.')
Path('native-artifacts/BUILD_INFO.json').write_text(json.dumps(info,indent=2)+'\n')
