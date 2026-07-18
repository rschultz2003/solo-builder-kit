# Contributing

This kit gets better when people who actually build with it send back what they learned. Contributions of any size are welcome.

## What makes a good contribution

- **New reusable prompts** in `prompts/`: things you actually run before shipping, not theory. Follow the style of `forensic-audit.md`: direct, specific, severity-ranked output.
- **New subagents or commands** in `.claude/`: small, single-purpose, with a clear "when to use" in the description.
- **Ports and adaptations**: the same discipline for other tools (Cursor, Codex, Windows/PowerShell install script).
- **Filled-in convention examples**: real "Project conventions" sections for common stacks so beginners see what good looks like.
- **Fixes**: stale model names, pricing, or platform behaviour. This stuff changes monthly; corrections are gold.

## Ground rules

1. Keep it small. One change per PR, readable in one sitting (the kit practises what it preaches).
2. Keep the voice: plain language, no hype, honest about tradeoffs.
3. Nothing that encourages letting AI do irreversible things. That rule is the spine of the kit and it is not negotiable.
4. Test what you touch: if you change the install script, run it against a fresh folder; if you change a command, run it in Claude Code.

## How

Open an issue first for anything bigger than a fix, so we agree on the shape before you build it. Look for issues labelled `good first issue` if you want somewhere to start.
