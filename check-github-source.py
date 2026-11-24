#!/usr/bin/env python3
"""RetroBooth v0.9 source preflight: run from repository root."""
import json, pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parent
manifest=json.loads((root/'source-required-sha256.json').read_text(encoding='utf-8'))
missing=[p for p in manifest if not (root/p).is_file()]
tracked=set()
git_available=False
try:
  tracked=set(subprocess.check_output(['git','ls-files','--cached','--full-name','-z'],cwd=root).decode().split('\0'))
  git_available=True
  untracked=[p for p in manifest if p not in tracked]
except (FileNotFoundError,subprocess.CalledProcessError):
  untracked=[]
  print('NOTE: git ls-files unavailable; checked filesystem only.')
print('Required source paths:',len(manifest))
print('Missing:',len(missing))
for p in missing: print('  MISSING:',p)
print('Not in git index:',len(untracked))
for p in untracked: print('  NOT COMMITTED:',p)
print('Dotfiles:')
for p in ['src/.htaccess','cloud/public_html/.htaccess','cloud/retrobooth_private/.htaccess','.github/workflows/build-all.yml']:
 print('  ',p,'OK' if (root/p).is_file() and (not git_available or p in tracked) else 'MISSING OR UNTRACKED')
if missing or untracked:
 print('FAIL: Restore missing files, git add, commit, push, then rerun on the main branch.')
 sys.exit(1)
print('PASS: All baseline required files exist and are staged/tracked in this checkout.')
print('Note: This does not prove they were pushed to GitHub. Confirm main branch commit and rerun CI.')
