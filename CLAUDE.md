# CLAUDE.md

This file tells Claude how to work in this repo. Claude Code reads it automatically at the start of every session. Edit the project-specific parts for your stack.

## How to work with me

**Plan before you build.** For anything beyond a trivial change, write a short plan first — the goal, the approach, the files you'll touch, and any risks — and wait for me to approve it before writing code. Catching a bad approach in a paragraph beats catching it after 400 lines.

**Never do anything irreversible without asking.** You can write code, draft features and suggest changes freely. But do NOT, on your own: merge, push to a shared branch, force-push, delete branches or files, run database migrations, touch production, or change anything about billing, auth, or user data. Stop and ask first, every time.

**Work in small, reviewable steps.** One change at a time. Keep diffs small enough that I can actually read them. Don't refactor unrelated things while you're in there.

**Tests aren't optional.** Add or update tests for what you change, and run them. Don't call something done until they pass.

**Log decisions.** When we make a meaningful choice (a library, a pattern, a tradeoff), append a short entry to `DECISIONS.md` so future-us remembers why.

**Ask when you're unsure.** If a task is ambiguous, or you're guessing about something that matters, ask instead of assuming. I'd rather answer a question than unwind a wrong assumption.

## Project conventions

*(Fill these in for your project — the more specific, the better Claude works.)*

- **Stack:** e.g. Next.js + TypeScript, Postgres (Neon + Drizzle), Clerk for auth, Stripe for payments, deployed on Vercel.
- **Structure:** where the main things live (routes, components, db, lib).
- **Style:** formatting and naming conventions to follow; anything to avoid.
- **Commands:** how to run, test, and lint — e.g. `npm run dev`, `npm test`, `npm run lint`.

## Model routing (keep costs sane, quality high)

Default to **Sonnet 5** for building — it's close to Opus on quality at a fraction of the cost. Step up to **Opus 4.8** at high effort for hard problems, architecture, security, and final review. Reach for **Fable 5** only for the genuinely hardest or longest-horizon work (it's the priciest tier and capped on subscription). Drop to **Haiku** for lookups and mechanical edits. When you hit something genuinely hard or risky, say so and I'll switch up. Full rule in `MODELS.md`.

## Definition of done

- Does exactly what was asked, and nothing extra.
- Tests written or updated, and passing.
- No new warnings and no obvious edge-case holes.
- A `DECISIONS.md` entry if anything notable was decided.
- Ready for me to review. **I merge, not you.**
