# Decisions

A running log of the meaningful choices in this project and why. Newest at the top. Append with `/decision`.

**Why keep this:** solo projects lose context fast. Six weeks from now you won't remember why you picked X over Y — this file remembers for you, and it's the fastest way to get an AI (or a future teammate) up to speed.

---

## 2026-01-01 — Example: chose Neon over local Postgres
**Decision:** Use Neon serverless Postgres for both dev and prod.
**Why:** Zero setup, generous free tier, clean branch-per-environment. The alternative — local Postgres plus a managed prod DB — is more moving parts for a solo project.
**Tradeoffs:** Cold starts on the free tier; some lock-in to Neon's branching model.

---

*(Delete the example and start logging your own.)*
