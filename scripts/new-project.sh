#!/usr/bin/env bash
# Drop the solo-builder-kit into a project in one command.
# Usage: run from the kit folder, passing your project path:
#   ./scripts/new-project.sh /path/to/your/project
# Safe: never overwrites an existing CLAUDE.md, MODELS.md, DECISIONS.md, or .claude file.
set -euo pipefail

TARGET="${1:-.}"
KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Setting up solo-builder-kit in: $TARGET"

# Root docs (don't overwrite existing)
for f in CLAUDE.md MODELS.md DECISIONS.md; do
  if [ ! -f "$TARGET/$f" ]; then
    cp "$KIT_DIR/$f" "$TARGET/$f"; echo "  + $f"
  else
    echo "  . $f already exists, skipping"
  fi
done

# The whole .claude folder: commands, agents, settings (don't overwrite existing files)
mkdir -p "$TARGET/.claude"
cp -rn "$KIT_DIR/.claude/." "$TARGET/.claude/" 2>/dev/null || true
echo "  + .claude/ (commands, agents, settings.json)"

echo "Done. Open the project in Claude Code — it defaults to Sonnet 5. Start with /plan."
