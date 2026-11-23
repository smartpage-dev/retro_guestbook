"""Compile and execute ONLY the platform-independent ticket core on the real JVM."""
from pathlib import Path
import subprocess, tempfile
R=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='retro-java-') as out:
    sources=sorted((R/'android/app/src/main/java/studio/luce/retrobooth/printing').glob('*.java'))
    sources.append(R/'tests/java/TicketCoreTest.java')
    subprocess.run(['javac','--release','17','-d',out,*map(str,sources)],check=True,cwd=R)
    subprocess.run(['java','-cp',out,'TicketCoreTest'],check=True,cwd=R)
