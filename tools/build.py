"""Compatibility entry point; one canonical deterministic Node builder."""
from pathlib import Path
import subprocess
r=Path(__file__).resolve().parents[1]
subprocess.run(["node",str(r/"tools/build.mjs")],cwd=r,check=True)
