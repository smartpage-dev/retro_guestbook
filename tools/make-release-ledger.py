"""Regenerate the immutable, Git-trackable build-source ledger for a canonical release.

Maintainer tool only. Never use it to bless a partially merged GitHub working tree:
start from the full verified source and re-run its tests first.
"""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
DIRS={'.github','android','cloud','desktop','docs','history','launchers','patches','src','tests','tools','vendor'}
ROOT={'package.json','VERSION.txt','LICENSE.txt','CHANGELOG.md','README.md','START_HERE.md','SOURCE_PROVENANCE.json','.gitignore','.gitattributes','requirements-test.txt','requirements-docs.txt','SYNC_TO_GITHUB.cmd'}
SKIP={'__pycache__','build','node_modules','.gradle','release','.smoke-output','web','data','dist','artifacts'}
TEXT={'.txt','.md','.json','.js','.mjs','.cjs','.ts','.yml','.yaml','.py','.html','.css','.xml','.gradle','.properties','.php','.sh','.command','.bat','.cmd','.ps1','.patch'}
def include(p):
 rel=p.relative_to(R); parts=rel.parts
 if len(parts)==1: return p.name in ROOT
 if parts[0] not in DIRS or any(x in SKIP for x in parts):return False
 if parts[:6]==('android','app','src','main','assets','www'):return False
 if p.name in {'config.php','local.properties','.env'} or p.suffix.lower() in {'.pyc','.jks','.keystore','.p12','.pem','.pfx','.key','.b64'}:return False
 return p.is_file() and not p.is_symlink()
def normalized(p):
 b=p.read_bytes()
 if p.suffix.lower() in TEXT or p.name in {'.htaccess','.gitignore','.gitattributes'}:b=b.replace(b'\r\n',b'\n')
 return b
files={p.relative_to(R).as_posix():hashlib.sha256(normalized(p)).hexdigest() for p in sorted(R.rglob('*')) if include(p)}
manifest={'schema':'retrobooth-source-ledger-v1','version':'0.9.8-alpha.1','androidVersionCode':17,'description':'Immutable build-source paths for a complete v0.9.8 GitHub commit; excludes generated caches, artifacts, live media, credentials and QA images.','files':files}
(R/'RELEASE_SOURCE_SHA256.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=True)+'\n',encoding='utf8')
print('Generated release source ledger with',len(files),'files')
