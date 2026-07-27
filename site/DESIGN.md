# reubendorje.com — design brief

Read this before changing anything. It exists so a refinement pass improves the site
instead of quietly resetting it to a default.

## What this site is

The personal lead-gen hub for **Reuben Dorje** (@reubendorje), a solo software founder
in Adelaide shipping seven products with no team and no funding.

Its single job: **turn X traffic into email subscribers by giving away genuinely good work.**

Everything else on the page is in service of that. The product ledger exists to make the
free material credible. The playbook page exists so people can read before they subscribe.
If a change makes the page prettier but weakens the path to the email field, it is the
wrong change.

Audience: aspiring solo founders and indie hackers who already build with AI. They have
seen a thousand landing pages and can smell a funnel. Do not make this look like one.

## Design direction — LOCKED

**Soft 3D.** Bright, warm, depth and glow. Rendered spheres as the signature element.
This was chosen deliberately over three alternatives (Terminal, Editorial, Kinetic Bold)
and carries across the playbook, the PDF, and every future drop. It is not up for revision.

### Colour

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#FBFAF9` | canvas |
| `--paper-tint` | `#FFF6F4` | alternating section wash |
| `--white` | `#FFFFFF` | cards |
| `--ink` | `#16130F` | text, dark panels |
| `--muted` | `#6E6860` | secondary text |
| `--hair` | `#EAE4DD` | 1px rules and borders |
| `--coral` | `#FF5A4E` | **the anchor.** primary CTA, accents |
| `--coral-deep` | `#C8341F` | small coral text (contrast safe) |
| `--peach` | `#FFB39A` | gradient partner, warm orbs |
| `--violet` | `#7C6CF5` | gradient partner, cool orbs |

Gradients: `coral → peach` (warm) and `coral → violet` (cool). Nothing else.

Coral is a scalpel. One or two focal uses per viewport. If a screen has three coral
elements competing, two of them are wrong.

### Type

- Display — **Sora** 600. Headings only. Tight tracking (`-.025em`).
- Body — **Plus Jakarta Sans** 400/500.
- Utility — **IBM Plex Mono** 500. Eyebrows, status labels, numerals. Uppercase, `.18em` tracking.

### The signature

The orbs. Soft-rendered spheres with a specular highlight (`::after` radial gradient at
30% 24%), gentle float animation, scroll parallax at varying depths.

They are the one memorable thing. Push them further if you can, but keep everything
around them quiet. If you add a second competing flourish, remove one.

## Voice — LOCKED, and easy to break by accident

Reuben's voice rules, in force everywhere on this site:

- Casual lines are **all lowercase** and use **no apostrophes**
  (`everything i wish someone handed me before i wasted years figuring it out.`)
- Explanatory body copy is normal sentence case with correct punctuation.
- **No em dashes.** Anywhere. Use a comma, a full stop, or restructure.
- No emojis. No hashtags. No exclamation marks.
- No grindset language. No "10x", "unlock", "supercharge", "game-changer", "journey".
- The filter: **could 500 other accounts post this?** If yes, rewrite it.

Buttons say what happens. "Send me the playbook", not "Submit". Errors state the problem
and the fix, and do not apologise.

## What is open to you

Push on these:

- The orbs. Real 3D, better lighting, a page-load orchestration, richer scroll behaviour.
- The hero. It is currently type-led and correct but not yet remarkable.
- The library cards. Functional, could be more of a reward to land on.
- The ledger. A live product list is inherently interesting and is styled plainly right now.
- Micro-interactions on hover and focus.

## What must survive any refinement

1. Email capture stays above the fold on mobile within one scroll, and stays the
   highest-contrast moment on the page.
2. Both pages keep the identical token block. They must not drift apart.
3. `prefers-reduced-motion` is respected. Every animation has a static fallback.
4. Visible keyboard focus (`:focus-visible`, violet ring). Do not remove it.
5. Accordion a11y on `/playbook`: real `<button>`, `aria-expanded`, keyboard operable.
6. Scroll work stays inside `requestAnimationFrame`. No layout thrash on scroll.
7. Copy stays in the voice above.
8. Zero build step. Static HTML, deployed as-is.

## Known gaps

- ~~`FORM_ENDPOINT` is empty in both pages.~~ Connected. Loops.so newsletter-form
  endpoint is set in both pages and the two values match. Keep them identical.
- `/playbook` has principles 01 and 02 written. Principles 03 to 05 and Parts 02 onward are
  placeholders marked with a `.todo` block. Structure is done, it is copy-in only.
- No favicon yet.
