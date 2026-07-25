# Decisions

A running log of the meaningful choices in this project and why. Newest at the top. Append with `/decision`.

**Why keep this:** solo projects lose context fast. Six weeks from now you won't remember why you picked X over Y — this file remembers for you, and it's the fastest way to get an AI (or a future teammate) up to speed.

---

## 2026-07-25 — Orbs: one transform authority, in a shared file
**Decision:** Physics lives in `site/public/orbs.js`, loaded by both pages, and is the only writer of `transform` on an orb. Render decomposes as `rendered = R(scrollY) + p`, with physics acting only on the offset `p`.
**Why:** The original bug was two systems writing one property. Keeping scroll out of the integrator makes scrolling exact rather than something a spring chases, and makes sleep a clean test (`|p|≈0 && |v|≈0`). A shared external file is still zero-build and makes the required "both pages share identical physics code" structurally true — these two files had already drifted once, in their token blocks.
**Tradeoffs:** One extra request, and the pages are no longer standalone single files.

## 2026-07-25 — Orbs decide per-pointerdown whether they may be grabbed
**Decision:** Orbs are `pointer-events:none`. On `pointerdown` the module checks what is actually underneath and only claims the event when that spot is inert, testing text against its line boxes rather than the block's full width.
**Why:** Orbs paint above the page and parallax sweeps them across every section, so no resting position is safe for the whole scroll range — a scan found orbs over a CTA and over the H1. Placement alone could not satisfy "orbs never block a link, button or text selection".
**Tradeoffs:** An orb sitting entirely over dense text cannot be grabbed at that moment. Desktop needs a hover-gated class for the grab cursor, since `pointer-events:none` suppresses it.

## 2026-07-25 — Spring tail is eased home rather than left to converge
**Decision:** Once an orb is both slow and close, ease the remaining offset home over ~0.8s instead of waiting for the spring.
**Why:** The settle is deliberately weak so a throw reads as a throw. Measured, that meant bouncing finished by ~3s but the sleep threshold was not reached until ~12s, holding the rAF loop open for nine seconds of motion nobody can see. Sleep now lands at 8.4s.
**Tradeoffs:** The last stretch is not strictly spring motion. Visually it reads as arriving rather than creeping.

---

## 2026-01-01 — Example: chose Neon over local Postgres
**Decision:** Use Neon serverless Postgres for both dev and prod.
**Why:** Zero setup, generous free tier, clean branch-per-environment. The alternative — local Postgres plus a managed prod DB — is more moving parts for a solo project.
**Tradeoffs:** Cold starts on the free tier; some lock-in to Neon's branching model.

---

*(Delete the example and start logging your own.)*
