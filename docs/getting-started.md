# Getting started

New to building with Claude Code? Here's zero-to-building with this kit.

## 1. Get Claude Code

Install Claude Code and sign in. (Check the official Claude Code docs for the current install steps and requirements — they change, so I won't hardcode them here.)

## 2. Drop this kit into your project

Copy `CLAUDE.md` and the `.claude/` folder into your project root. Or, from this kit's folder, run:

```bash
./scripts/new-project.sh /path/to/your/project
```

Claude Code reads `CLAUDE.md` automatically every session — that's what makes it work the way it should from the first message.

## 3. Fill in your conventions

Open `CLAUDE.md` and fill in the **Project conventions** section: your stack, your structure, and how to run and test the project. The more specific you are, the better the output. Vague brief in, vague code out.

## 4. The build loop

1. `/plan what you want to build` → Claude writes a plan. You read it and approve (or redirect).
2. Claude builds it in small steps. You read the changes as they come.
3. `/review` → Claude hunts for what's wrong before it goes in.
4. **You** merge, push, and deploy. Never the AI.
5. `/decision` → log anything notable for later.

That loop is the whole thing. It keeps you fast without letting the AI run off a cliff.

## 5. The mindset

The tools change every month; the discipline doesn't. You're the architect and the reviewer — Claude is a brilliant builder with no judgement about *what* to build. Keep your hand on anything irreversible, review everything, and ship small.

More on the whole approach in **The Solo Builder's Playbook**, coming soon. Follow [@reubendorje](https://x.com/reubendorje) to get it first.
