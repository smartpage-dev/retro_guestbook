#!/usr/bin/env python3
"""Strict regression for version-safe APK artifact verification (no Android SDK)."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/verify_apk_badging.py"
BASE = """plugins { id 'com.android.application' }
android {
 defaultConfig {
   applicationId 'studio.luce.retrobooth.preview'
   versionCode {code}
   versionName '{version}'
 }
}
"""


class ApkBadgingTests(unittest.TestCase):
    def run_case(self, *, code="18", version="0.9.9-alpha.1", apk_code="18", apk_version="0.9.9-alpha.1", appid="studio.luce.retrobooth.preview", badging=True):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "android/app").mkdir(parents=True)
            (root / "android/app/build.gradle").write_text(BASE.replace("{code}", code).replace("{version}", version), encoding="utf8")
            f = root / "APK_INFO.txt"
            if badging:
                f.write_text(f"package: name='{appid}' versionCode='{apk_code}' versionName='{apk_version}' platformBuildVersionCode='35'\n", encoding="utf8")
            else:
                f.write_text("application-label:'RetroBooth'\n", encoding="utf8")
            return subprocess.run([sys.executable, str(SCRIPT), str(f), "--root", str(root)], capture_output=True, text=True)

    def test_correct_release(self):
        self.assertEqual(0, self.run_case().returncode)

    def test_previous_release_16_rejected(self):
        p = self.run_case(apk_code="16")
        self.assertNotEqual(0, p.returncode)
        self.assertIn("versionCode", p.stderr)

    def test_wrong_version_name_rejected(self):
        self.assertNotEqual(0, self.run_case(apk_version="0.9.6-alpha.1").returncode)

    def test_wrong_app_id_rejected(self):
        self.assertNotEqual(0, self.run_case(appid="org.wrong.package").returncode)

    def test_no_aapt_package_rejected(self):
        self.assertNotEqual(0, self.run_case(badging=False).returncode)

    def test_next_release_dynamically_accepted(self):
        self.assertEqual(0, self.run_case(code="18", version="0.9.9-alpha.1", apk_code="18", apk_version="0.9.9-alpha.1").returncode)

    def test_next_release_outdated_code_rejected(self):
        self.assertNotEqual(0, self.run_case(code="18", version="0.9.9-alpha.1", apk_code="17", apk_version="0.9.9-alpha.1").returncode)


if __name__ == "__main__":
    unittest.main(verbosity=2)
