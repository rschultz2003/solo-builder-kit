# Decisions

A running log of the meaningful choices in this project and why. Newest at the top. Append with `/decision`.

**Why keep this:** solo projects lose context fast. Six weeks from now you won't remember why you picked X over Y — this file remembers for you, and it's the fastest way to get an AI (or a future teammate) up to speed.

---

## 2026-07-25 — Expand-all belongs at the top of the document, not per part
**Decision:** When Parts 02 onward land on `/playbook`, move the "Expand all" control to a single instance at the top of the document. Do not add one per part.
**Why:** Both use cases it serves are document-wide, not section-wide: linear reading by a screen reader, and find-in-page. A per-part control serves neither, and multiplies a low-value affordance once per section.
**Status:** left inside Part 01 for now, because Part 01 is the only content on the page. The control is written against however many accordions exist, so the move is a markup relocation with no logic change.
**Also note:** with 5 accordions the control is a marginal affordance. At the full document's ~19 it is the difference between the guide being linearly readable and not. It is currently solving a problem that has not arrived yet.

## 2026-07-25 — Do not derive discrete state from a continuous measurement
**Decision:** Where a system needs to know "is this thing in state X", store that state explicitly. Do not infer it from a continuously varying quantity.
**Why:** Orb wall enforcement was gated on current speed, on the assumption that a slow orb had settled. It had not. When an orb's rest position scrolled off screen, the settle spring kept re-accelerating it past the threshold while the wall pushed it back, and the two ground against each other in a limit cycle that never slept. The threshold was a condition that could never be reached, because the thing being measured was being actively driven through it. Replaced with an explicit `flying` flag, set on release and cleared once on slowing.
**Tradeoffs:** One more piece of state to keep correct. Cheap next to a failure mode that only appears in a specific combination of throw and scroll, and that no amount of threshold tuning could have fixed.
**Generalises:** any "is it moving / idle / finished / settled" test written as a comparison against a live value. The same shape shows up in debounce-by-velocity, scroll-end detection, and animation-complete checks.

## 2026-07-25 — Not using hidden="until-found" for collapsed accordion panels
**Decision:** Collapsed panels use `inert`, plus an explicit "Expand all" control to restore find-in-page. Not `hidden="until-found"`.
**Why:** `hidden="until-found"` solves the find-in-page case natively — the browser reveals the panel when a match is inside it — but it is Chromium and Safari 18+ only, so Firefox would need the manual branch anyway. Carrying both paths is not worth it today.
**Revisit when:** Firefox ships it. At that point `hidden="until-found"` replaces the inert bookkeeping and the "Expand all" control becomes a pure affordance rather than an accessibility requirement.

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
