#!/usr/bin/env python3
"""Fail fast if RetroBooth package/desktop/Android release versions drift.

Standard-library only; safe to call before npm/Gradle/native compilation.
"""
import argparse
import json
import re
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description='Check RetroBooth release version alignment.')
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1],
                        help='Repository root (used for isolated regression tests)')
    args = parser.parse_args()
    root = args.root.resolve()
    candidates = {
        'package.json': lambda: json.loads((root / 'package.json').read_text(encoding='utf-8'))['version'],
        'desktop/package.json': lambda: json.loads((root / 'desktop/package.json').read_text(encoding='utf-8'))['version'],
        'VERSION.txt': lambda: (root / 'VERSION.txt').read_text(encoding='utf-8').splitlines()[0].strip(),
    }
    found = {}
    errors = []
    for source, reader in candidates.items():
        try:
            value = reader()
            if not isinstance(value, str) or not value.strip():
                raise ValueError('empty version')
            found[source] = value
        except (FileNotFoundError, KeyError, ValueError, IndexError, json.JSONDecodeError) as exc:
            errors.append(f'Cannot read version from {source}: {exc}')
    gradle_path = root / 'android/app/build.gradle'
    try:
        gradle = gradle_path.read_text(encoding='utf-8')
        match = re.search(r"(?m)^\s*versionName\s+['\"]([^'\"]+)['\"]\s*$", gradle)
        if not match:
            raise ValueError('missing versionName literal')
        found['android/app/build.gradle'] = match.group(1)
    except (FileNotFoundError, ValueError) as exc:
        errors.append(f'Cannot read Android version: {exc}')
    print('RetroBooth release version alignment:')
    for source, value in found.items():
        print(f'  {source}: {value}')
    target = found.get('package.json')
    if target:
        for source, value in found.items():
            if value != target:
                errors.append(f'MISMATCH: {source} has {value!r}, but root package.json has {target!r}')
    if errors:
        print('\nVERSION ALIGNMENT FAILED:', file=sys.stderr)
        for message in errors:
            print('  - ' + message, file=sys.stderr)
        print('Restore the matching files from the SAME v0.9.8 full repository archive; '
              'commit and push them together before starting a NEW workflow run.', file=sys.stderr)
        return 1
    print('PASS: all four release version declarations match.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
