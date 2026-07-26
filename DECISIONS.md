# Decisions

A running log of the meaningful choices in this project and why. Newest at the top. Append with `/decision`.

**Why keep this:** solo projects lose context fast. Six weeks from now you won't remember why you picked X over Y — this file remembers for you, and it's the fastest way to get an AI (or a future teammate) up to speed.

---

## 2026-07-26 — Order of launch work after PR #5
**Decision:** `FORM_ENDPOINT` goes in first, before the Design refinement pass, even though that pass will rewrite parts of both pages.
**Why:** the form path is already verified end to end against a stubbed endpoint — invalid input, the loud failure when the endpoint is empty, the disabled button and "Sending…" label during submit, and the restore on both success and failure. So it is a five minute paste, not a build. Until it lands the site cannot capture a single email, which is its only job. Playbook principles 03 to 05 are also paste-and-verify and can follow immediately. The refinement pass runs last and may redo surrounding markup; re-verifying a pasted endpoint afterwards is cheaper than leaving the site unlaunchable while the pass runs.
**Constraint:** the endpoint value comes from the Loops dashboard. Do not stub, placeholder or invent one — the empty-value failure is deliberate and visible, and a fake value would replace a loud failure with a silent one.
**Status:** not started. None of this moves without a brief.

## 2026-07-26 — Establish what a measurement means before reading meaning into its value
**Rule:** A number is not a finding until you know what it would look like if nothing were wrong.

Three times in this PR a number was read as evidence for something it did not establish:

1. **A speed threshold treated as a settled-state flag.** Wall enforcement gated on current velocity, on the assumption that a slow orb had settled. The spring kept driving it back through the threshold, producing a limit cycle that never slept.
2. **A single profiling run treated as an attribution.** One trace showed an 11.5 ms worst-frame penalty for `backdrop-filter`. Repeat runs reversed the direction. The effect was nearly deleted for nothing.
3. **A per-frame event count treated as a cost.** 6 `Animation` style invalidations per frame read as proof the float animations were not accelerated, and a ~469 ms optimisation lever built on top of it. A plain control probe showed the identical count with nothing wrong.

In each case the fix was the same shape: find the baseline first — an explicit state flag, a repeat run, a control probe. The instinct to reach for is *"what does this number read when the system is healthy?"* rather than *"what could explain this number being bad?"* The second question is unfalsifiable and invites a hypothesis hunt; the first ends it in minutes.

Per-instance detail is in the three entries below.

## 2026-07-26 — Per-frame "Animation" style invalidations are not a compositing signal
**Finding:** A trace of a hard throw showed 6 `StyleRecalcInvalidationTracking` events per frame with reason `Animation`, one per element running the float keyframes. The obvious reading — that the animations are not compositor-accelerated and are ticking on the main thread — is **wrong**.
**How it was settled:** six probe elements, all running the identical float keyframes, differing only in surrounding condition: plain in the body; inside a parent whose inline transform is rewritten every frame; with `backdrop-filter` on itself; inside a `clip-path` parent; inside a rounded `overflow:hidden` parent; and one with `will-change:transform`. **All six recorded exactly 1.00 invalidation per frame, including the plain control and the `will-change` case.**
**Conclusion:** Blink records this event once per frame for any element with a running CSS animation, regardless of whether that animation is compositor-driven. The count is bookkeeping, not a cost signal and not a promotion signal. There is therefore no "get the animations accelerated" lever worth ~469ms; that lever does not exist as described.
**What this does not establish directly:** whether the animations actually are composited. The invalidation count is silent either way, and the cc layer tree is not exposed by the tooling used here.
**But the same trace answers it indirectly, and strongly:** main-thread painting over that window was **1.4 ms across 1456 frames** — essentially zero repainting. A transform animation on an element *without* its own composited layer dirties the parent layer's region every frame and forces a repaint of the area it travels through; four orbs crossing the viewport would produce a large, obvious paint number. 1.4 ms is not that. So the orbs almost certainly do have their own layers and the animations almost certainly are compositor-driven. **Strong indirect evidence, not proof** — and it was sitting in the data before the probe was ever written.
**Why the unresolved buckets cannot hide it:** main-thread Painting is the *record* step, not raster. A moving element without its own layer changes its containing layer's display list every frame, because the element is somewhere new and the recording therefore differs, and that recording cannot be moved off the main thread. Raster can go to worker threads; upload can go to the GPU process; the recording cannot. So four orbs crossing the viewport for 1456 frames would show a substantial main-thread paint number whatever the other buckets contained. 1.4 ms total is ~0.001 ms per frame: the absence of a recording cost, not a small one.
**Still worth stating:** compositor-thread (277 ms) and GPU-process (382 ms) time could not be sub-categorised by this tooling and is bucketed as system/other. True, and worth knowing for any other question — but not load-bearing for this inference.
**Not pursued further:** `LayerTree.enable` over CDP would settle it definitively, but no decision hangs on the answer — the mitigations stay unwarranted either way at a ~15% duty cycle. Curiosity, not engineering. Logged and stopped.
**Also ruled out:** ancestor clips. An A/B with `clip-path` removed from the orb layer and rounded `overflow:hidden` removed from `.capture` produced 6.00 invalidations per frame either way.
**General case:** see "Establish what a measurement means before reading meaning into its value" above.

## 2026-07-26 — If the progress bar jump ever needs fixing, animate it
**Decision:** Left as-is. Bulk expand changes document height in one frame, so the progress bar jumps backwards (~10.6 points at 5 accordions, more at 19). It is never wrong: the `ResizeObserver` corrects it within 50ms and collapse restores it exactly.
**Why note it:** the artifact is the *discontinuity*, not the value. A reader appearing to lose progress is a small perception cost on a page whose job is getting people down to the capture field, and it scales with accordion count. If it becomes worth fixing, the fix is transitioning the bar to its new value rather than snapping — not recomputing anything.

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
