#!/usr/bin/env python3
"""Verify aapt's actual signed-APK package metadata against Gradle defaults.

No hard-coded release version. Run *after* apksigner and aapt dump badging.
Python stdlib only; fails closed on missing/ambiguous APK metadata.
"""
import argparse
import re
import sys
from pathlib import Path


FIELDS = ("applicationId", "versionCode", "versionName")


def gradle_expected(path: Path) -> dict[str, str]:
    source = path.read_text(encoding="utf-8")
    result = {}
    for name in FIELDS:
        pattern = rf"(?m)^\s*{name}\s+(['\"])([^'\"\r\n]+)\1\s*$" if name != "versionCode" else r"(?m)^\s*versionCode\s+([0-9]+)\s*$"
        matches = re.findall(pattern, source)
        if len(matches) != 1:
            raise ValueError(f"Gradle must have exactly one literal {name}, found {len(matches)}")
        result[name] = matches[0][1] if name != "versionCode" else matches[0]
    return result


def aapt_actual(path: Path) -> dict[str, str]:
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.startswith("package:")]
    if len(lines) != 1:
        raise ValueError(f"aapt badging must contain exactly one package: line, found {len(lines)}")
    value = lines[0]
    result = {}
    for key, gradle_key in (("name", "applicationId"), ("versionCode", "versionCode"), ("versionName", "versionName")):
        matches = re.findall(rf"(?:^|\s){key}='([^']*)'(?=\s|$)", value)
        if len(matches) != 1 or not matches[0]:
            raise ValueError(f"aapt package metadata has missing/ambiguous {key}")
        result[gradle_key] = matches[0]
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify package ID, versionCode and versionName in built Android APK")
    parser.add_argument("badging", type=Path, help="File saved by aapt dump badging")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Repository root")
    args = parser.parse_args()
    try:
        expected = gradle_expected(args.root / "android/app/build.gradle")
        actual = aapt_actual(args.badging)
    except (OSError, ValueError) as exc:
        print(f"APK METADATA VERIFICATION FAILED: {exc}", file=sys.stderr)
        return 1
    errors = []
    for key in FIELDS:
        if actual[key] != expected[key]:
            errors.append(f"{key}: APK {actual[key]!r} != Gradle {expected[key]!r}")
    if errors:
        print("APK METADATA VERIFICATION FAILED:\n  " + "\n  ".join(errors), file=sys.stderr)
        return 1
    print("PASS: signed APK badging agrees with Gradle: " + ", ".join(f"{k}={actual[k]}" for k in FIELDS))
    return 0


if __name__ == "__main__":
    sys.exit(main())
