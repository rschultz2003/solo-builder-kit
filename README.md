# solo-builder-kit

**the exact setup i use to build software solo with claude. free. steal it.**

I'm Reuben — a 22-year-old dropout building software products on my own with AI. This is the real toolkit I use every day: the config, commands, prompts and guardrails that let one person move like a whole team. No theory, just what actually works.

If you're starting out building with AI, this is the fastest way to do it *properly* instead of learning every mistake the hard way like I did.

---

## What's inside

- **[`CLAUDE.md`](CLAUDE.md)** — a battle-tested project brief that tells Claude how to work with you: plan before coding, never touch anything irreversible, small reviewable steps, tests, a decision log. Drop it in any repo and Claude instantly works the way it should.
- **[`MODELS.md`](MODELS.md)** — the model-routing playbook: Haiku / Sonnet 5 / Opus 4.8 / Fable 5, and which one for which job, so you get top-tier output without maxing your plan.
- **[`.claude/agents/`](.claude/agents)** — three pre-routed subagents: `explorer` (Haiku, fast lookups), `implementer` (Sonnet 5, the build work), `reviewer` (Opus 4.8, critical review).
- **[`.claude/settings.json`](.claude/settings.json)** — sensible defaults: the `sonnet` alias (which resolves to **Sonnet 5**) as the workhorse, so you never burn a premium model on routine work. Never Haiku.
- **[`.claude/commands/`](.claude/commands)** — custom slash commands for Claude Code:
  - `/plan` — write a plan and wait for your approval before writing any code
  - `/spec` — turn a rough idea into a small, atomic, testable spec
  - `/review` — hunt for what's wrong in the current changes before they ship
  - `/decision` — log a decision to `DECISIONS.md`
- **[`prompts/`](prompts)** — reusable prompts I actually use, like a forensic pre-ship audit that catches the gaps before your users do.
- **[`DECISIONS.md`](DECISIONS.md)** — the decision-log pattern that keeps a solo project sane.
- **[`docs/getting-started.md`](docs/getting-started.md)** — zero-to-building if you're new to Claude Code.
- **[`scripts/new-project.sh`](scripts/new-project.sh)** — drop this whole kit into a project in one command.

## Quick start

1. Copy `CLAUDE.md` and the `.claude/` folder into the root of your project.
2. Open the project in Claude Code — it reads `CLAUDE.md` automatically.
3. Start any task with `/plan` — Claude writes a plan, you approve, then it builds.
4. Before anything ships, run `/review`. You do the merging and deploying — never the AI.

Or, from this folder:

```bash
./scripts/new-project.sh /path/to/your/project
```

## The one rule that matters most

Never let AI do anything you can't undo. It can write code and draft entire features — but merging, deleting, pushing to production, touching live data or billing, *you* do yourself, every time. This kit builds that habit in. It's the single thing that separates people who ship safely from people who nuke their own database at 2am.

## Why this exists

Most "build with AI" content is hype. I wanted to put the actual system in one place — the same one I use to run [TaskBolt](https://x.com/reubendorje) and [LOKT](https://x.com/reubendorje) as one person. The tools change every month; this workflow doesn't. Take it, fork it, make it yours.

The full philosophy behind it is in **The Solo Builder's Playbook**, coming soon. Follow [@reubendorje](https://x.com/reubendorje) to get it first.

Where this is headed: [ROADMAP.md](ROADMAP.md). Want to help: [CONTRIBUTING.md](CONTRIBUTING.md).

## Follow the build

I share the whole thing in public — what's working, what broke, what I'm shipping.

→ **[@reubendorje on X](https://x.com/reubendorje)**

## License

MIT — do whatever you want with it. A star ⭐ helps other solo builders find it.
