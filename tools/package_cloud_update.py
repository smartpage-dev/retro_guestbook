#!/usr/bin/env python3
"""Bundle only RetroBooth PHP cloud CODE to safely upgrade existing Hostinger sites.

Never includes config.php, guest videos, live JSON records, device bundles or keys.
Build the web frontend first: `node tools/build.mjs`.
"""
from pathlib import Path
import hashlib, json, zipfile

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'cloud/public_html'
PRIVATE=ROOT/'cloud/retrobooth_private'
OUT=ROOT/'artifacts/RetroBooth_v0.9.8_Hostinger_PHP_Cloud_Update.zip'
SKIP={'.env','config.php','data','node_modules','__pycache__'}
SENSITIVE={'.key','.pem','.p12','.jks','.keystore','.db','.sqlite','.sqlite3','.webm','.mp4','.mov','.mkv'}
files={}
for src in sorted(PUBLIC.rglob('*')):
 if not src.is_file() or src.is_symlink():continue
 if any(part in SKIP for part in src.relative_to(PUBLIC).parts) or src.suffix.lower() in SENSITIVE:
  raise SystemExit('Unsafe public cloud source present: '+str(src))
 files['public_html/'+src.relative_to(PUBLIC).as_posix()]=src.read_bytes()
for src in [PRIVATE/'.htaccess',PRIVATE/'app/Cloud.php',PRIVATE/'tools/cleanup.php']:
 if not src.is_file():raise SystemExit('Missing required private PHP code: '+str(src))
 files['retrobooth_private/'+src.relative_to(PRIVATE).as_posix()]=src.read_bytes()
need=['public_html/.htaccess','public_html/index.php','public_html/admin/index.html','public_html/guest/index.html','public_html/show/index.html','public_html/booth/index.html','public_html/assets/admin.js','public_html/assets/guest.js','public_html/assets/show.js','retrobooth_private/app/Cloud.php']
assert all(f in files for f in need)
manifest={'schema':'retrobooth-hostinger-code-only-v1','version':(ROOT/'VERSION.txt').read_text().strip(),'purpose':'UPGRADE EXISTING SITE; NEVER overwrite private config.php/data','sha256':{k:hashlib.sha256(v).hexdigest() for k,v in files.items()}}
files['CLOUD_CODE_SHA256.json']=(json.dumps(manifest,indent=2,ensure_ascii=True)+'\n').encode()
files['READ_ME_BEFORE_UPLOAD_ZH.md']=(ROOT/'docs/RETROBOOTH_V098_UI_TICKET_ZH.md').read_bytes()
OUT.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in files.items():
  zi=zipfile.ZipInfo(name,(2026,11,27,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.create_system=3;zi.external_attr=0o100644<<16
  z.writestr(zi,data,compresslevel=9)
with zipfile.ZipFile(OUT) as z:
 assert z.testzip() is None
 assert not any(name.endswith('config.php') or '/data/' in name for name in z.namelist())
 assert all(hashlib.sha256(z.read(k)).hexdigest()==v for k,v in manifest['sha256'].items())
print(json.dumps({'file':str(OUT),'entries':len(files),'code_files':len(manifest['sha256']),'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()},indent=2))
