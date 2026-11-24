#!/usr/bin/env python3
"""Check repository source inputs required by the deterministic web bundler."""
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[1]
files = ['package.json','VERSION.txt','.github/workflows/build-all.yml','tools/build.mjs','tools/prepare-desktop.mjs','src/template.html','src/sw.js','src/.htaccess','vendor/NOTICE.txt','vendor/MIT.txt','vendor/APACHE-2.0.txt']
files += ['src/'+f for f in ['experience-views.html','delete-dialog.html','styles.css','landscape.css','appearance.css','delivery.css','delivery-view.html','delivery-admin.html','cloud-admin.html','cloud.css','printer-admin.html','printer.css','desktop-admin.html']]
files += ['src/'+f+'.js' for f in ['effects','delivery-policy','cloud-client','printer-client','core','store','renderer','receipt','app','experience','landscape','appearance','camera-lab','native-export','desktop','delivery-flow','cloud-flow','printer-flow']]
missing=[f for f in files if not (root/f).is_file()]
print(f'Checked {len(files)} required source files')
if missing:
    print('MISSING FILES:')
    for f in missing: print(' - '+f)
    sys.exit(1)
print('Required build inputs present (not a guarantee native build will succeed).')
