# MODELS.md — which model, when

The whole game on a Claude subscription is simple: **get top-tier output without burning through your weekly limit.** You do that by matching the *model* and the *effort* to the job. This is the exact routing this kit ships with — fork it and it works out of the box.

## The one idea

> Cost = **model price × effort × tokens used.**

Long tasks use the most tokens, so the model you pick for long work is where your quota goes:

**Put the cheap model on the long, bulky, low-stakes work (that's what drains your quota), and save the expensive model for the short, critical, high-judgment moments.**

The price gaps are big. A planning pass that reads 200k tokens and writes 40k costs about **$4 on Fable 5** versus about **$0.80 on Sonnet 5** — 5x for the same work. Run the top model on everything and you hit the wall in days.

## The tiers (as of July 2026)

- **Haiku 4.5** — fast and cheap. Lookups, mechanical edits, formatting.
- **Sonnet 5** — the workhorse and your default. Close to Opus 4.8 on quality at roughly a fifth of Fable's price. Most work should happen here.
- **Opus 4.8** — step up when Sonnet isn't enough: hard problems, architecture, security, review.
- **Fable 5** — the top of the stack (Mythos-tier). Built for the hardest, longest-horizon work: big migrations, complex multi-file builds, multi-day autonomous sessions. Use it deliberately (see caveats).

Plus the **effort** dial — `low` / `medium` / `high` / `xhigh`. More effort = more thinking = more tokens (thinking counts as output). "Fable medium" vs "Fable max" is this dial, not two models.

## The rule (this is the whole thing)

| The job | Model | Effort |
|---|---|---|
| Lookups, tracing code, mechanical edits, formatting | **haiku** | low |
| The build: features from a plan, bulk edits, tests, the long grind | **sonnet 5** | low–medium |
| Hard problems, architecture, security, final review | **opus 4.8** | high |
| The genuinely hardest / longest-horizon / most critical work | **fable 5** | high–xhigh |

Default to **Sonnet 5**. Step up to **Opus** for the hard stuff. Reach for **Fable** only when the task is big or hard enough to justify it. Drop to **Haiku** for the trivial. That's it.

## Switching models

- **Mid-session:** `/model` and pick, or `/model opus` / `/model sonnet` / `/model haiku`. For Fable, pick it in `/model` or use the `claude-fable-5` model string. Highest priority.
- **Per subagent:** the `model:` line in `.claude/agents/<name>.md`.
- **Default:** the `model` field in `.claude/settings.json` — this kit ships `sonnet`, which resolves to **Sonnet 5** (the alias always tracks the latest Sonnet). It is never Haiku.
- **Check what you're on and how much is left:** `/status` or `/usage`.

This kit ships three pre-routed subagents: `explorer` (Haiku, fast lookups), `implementer` (Sonnet 5, the build work), `reviewer` (Opus 4.8, critical review). They stay on always-available, cost-reasonable tiers on purpose. Reach for Fable manually when you're about to tackle something genuinely ambitious.

## Fable 5 — read before you lean on it

Fable is the most capable model, but right now it comes with strings:

- **Billed as metered usage credits since July 7, 2026**: $10 per million input / $50 per million output, about 5x Sonnet 5. It was briefly bundled into the weekly limit before that; now every Fable token is billed, so use it where it earns its keep.
- It can **auto-reroute some routine coding/debugging to Opus 4.8** (its safety classifiers flag certain cyber/bio-adjacent work). You are **not charged Fable rates** for rerouted requests, but expect the occasional silent step-down.
- It requires **30-day data retention** (not zero-data-retention) to run its safety classifiers. Worth knowing for sensitive client work.
- Its edge shows up on **long, complex, multi-stage tasks** — that's when to use it. For everyday coding, Sonnet 5 is the smart default.

## Why this protects your plan

- **Two weekly buckets — one across all models, and a separate one just for Sonnet.** Heavy work on Sonnet draws from the Sonnet bucket and spares your all-model (Opus/Fable) bucket. Two tanks, not one.
- **Fable bills as usage credits, not plan quota**: another reason the bulk belongs on Sonnet.
- **The weekly cap is the real wall, not the 5-hour window.** Keep the expensive models to short bursts.
- **Opus auto-falls-back to Sonnet at around 50% usage** on Max 20x.
- **Your pool is shared across Claude Code, chat, and Cowork** — heavy chat use eats coding quota.
- **Automation runs off a separate monthly credit** — `claude -p`, the Agent SDK, and GitHub Actions don't touch your interactive pool.

## Habits that save the most

- **`/compact` often** — a long session bloats context and every token counts.
- **Delegate heavy reading to the `explorer` subagent** — it reads in its own context and hands back a summary, keeping your main session lean.
- **Keep prompts under ~200K tokens** — above that, input is billed at a premium.
- **Skip deep thinking for mechanical work** — low effort for edits and boilerplate.
- **Watch your weekly absorption, not just today.**

## If you remember nothing else

**Default Sonnet 5. Opus for the hard stuff. Fable only for the truly ambitious. Haiku for the trivial. `/compact` a lot.**
