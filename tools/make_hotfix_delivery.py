from pathlib import Path
import zipfile,hashlib,json,shutil
R=Path('/mnt/data/retro_v091_camera_work');OUT=Path('/mnt/data')
source=R/'artifacts/RetroBooth_v0.9.1_Android_Windows_GitHub_Ready.zip'
flat=OUT/'RetroBooth_v0.9.1_Camera_Fix_COMPLETE_REPO_ROOT.zip'
patch=OUT/'RetroBooth_v0.9.1_Android_Camera_Fix_PATCH.zip'
base=OUT/'RetroBooth_v0.9_Independent_APK_EXE_GitHub_Ready.zip'
with zipfile.ZipFile(source) as z:current={i.filename.removeprefix('RetroBooth/'):z.read(i.filename) for i in z.infolist() if not i.is_dir()}
with zipfile.ZipFile(base) as z:old={i.filename.removeprefix('RetroBooth/'):z.read(i.filename) for i in z.infolist() if not i.is_dir()}
changed=[k for k in sorted(current) if current[k]!=old.get(k) and not k.startswith('qa/')]
# Patch carries only changed source/docs + manifest, not regenerated QA evidence.
with zipfile.ZipFile(patch,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name in changed:z.writestr(name,current[name])
 z.writestr('APPLY_THIS_PATCH_FIRST.txt', '''RetroBooth v0.9.1 Android camera hotfix\n\nApply this patch to the ROOT of an otherwise complete v0.9 independent Android/Windows workflows GitHub repository. Merge folders, preserve hidden .github, commit and push to the default branch. Do NOT upload the ZIP as a file. For uncertain/incomplete repositories use the COMPLETE_REPO_ROOT ZIP instead. Do not delete local recordings or reset cloud credentials.\n\nThen Actions > RetroBooth - Build Android APK > Run workflow. Expected Android versionCode 10. See docs/ANDROID_CAMERA_FIX_START_HERE.md.\n\nThis patch is source only; no compiled APK/EXE or real Android camera acceptance is claimed.\n''')
with zipfile.ZipFile(flat,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(current.items()):z.writestr(name,data)
for name,path in [('Android Camera Guide',R/'docs/ANDROID_CAMERA_FIX_START_HERE.md'),('Troubleshooting',R/'docs/ANDROID_CAMERA_TROUBLESHOOTING.md'),('Test report',R/'docs/CAMERA_HOTFIX_TEST_REPORT.md')]:
 shutil.copy2(path,OUT/('RetroBooth_v0.9.1_'+path.name))
for kind,p in [('full',flat),('patch',patch)]:
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  assert '.github/workflows/build-android.yml' in z.namelist()
  assert 'src/app.js' in z.namelist()
  print(kind,p.name,p.stat().st_size,len(z.namelist()),hashlib.sha256(p.read_bytes()).hexdigest())
assert current['android/app/src/main/assets/www/index.html']==current['cloud/public_html/booth/index.html']
manifest=json.loads(current['MANIFEST_SHA256.json'])
for name,hashval in manifest['files'].items():
 assert hashlib.sha256(current[name]).hexdigest()==hashval,name
print('manifest',len(manifest['files']),'passed')
