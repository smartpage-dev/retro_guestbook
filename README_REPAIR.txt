RetroBooth v0.9 tools repair

The failing GitHub Actions log says tools/prepare-desktop.mjs is missing from the repository root.
This archive contains the ORIGINAL tools/ files from the v0.9 GitHub Ready ZIP, unchanged.
Extract and copy the tools folder into the repository root (same level as package.json).
Do not nest it under RetroBooth/tools unless that is the repository root.
Commit and push to main, then rerun Actions.
This repairs missing tools files only. If other directories were omitted, upload the full v0.9 repository.
