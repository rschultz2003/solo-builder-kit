# reubendorje.com

Personal lead-gen site for [@reubendorje](https://x.com/reubendorje).
Static HTML. No build step, no framework, no dependencies.

## Structure

```
.
├── vercel.json          static preset + security headers + cleanUrls
├── DESIGN.md            design brief — read before changing anything visual
└── public/
    ├── index.html       home / hub
    ├── orbs.js          orb physics — loaded by both pages, keeps them in sync
    ├── playbook/
    │   └── index.html   The Solo Builder's Playbook (web version + print stylesheet)
    ├── the-solo-builders-playbook.pdf   the lead magnet, generated from the above
    ├── og.png           1200x630 social card — home
    ├── og-playbook.png  1200x630 social card — playbook
    ├── robots.txt
    └── sitemap.xml
```

## Before it goes live

Three things, in order:

1. ~~**Connect the form.**~~ Done. `FORM_ENDPOINT` is set to the Loops
   newsletter-form endpoint in both `public/index.html` and
   `public/playbook/index.html`, and the two values match.

   If you ever change it, change it in both. When the value is empty the form
   fails loudly with a visible message rather than silently swallowing
   signups; that behaviour is deliberate, so never replace it with a
   placeholder.

2. ~~**Fill the playbook gaps.**~~ Done. All five parts, the intro and the close
   are written in `public/playbook/index.html`, and the `.todo` block is gone.

   The text is verbatim from the original July build,
   `the-solo-builders-playbook.html`. Keep that file: a first pass at
   restoring the content silently paraphrased two intro sentences, stripped
   contractions, dropped the intro's closing line and shipped only one of
   Part 03's five toolkit groups. All of it was caught by diffing the page
   against the original sentence by sentence, which is worth redoing after
   any content edit.

3. ~~**Add a favicon.**~~ Done. `favicon.svg`, `favicon.ico` (32x32) and
   `apple-touch-icon.png` (180x180) ship in `public/`, linked from both pages.
   Render source is `og/favicon.html`; `og/favicon-proof.png` is the 16/32/180
   check sheet. Re-run that check if the mark ever changes: favicon work fails
   at 16px, not at 180.

## Deploy

Vercel, static preset, no build command. `vercel.json` already sets
`outputDirectory: public` and an empty `buildCommand`, which is what stops Vercel
auto-detecting a framework that is not there.

```
vercel --prod
```

Then point the apex A record and the `www` CNAME at Vercel. SSL is automatic.

## Local preview

```
cd public && python3 -m http.server 8000
```

Open http://localhost:8000. Note `cleanUrls` is a Vercel feature, so locally
`/playbook` needs the trailing slash: http://localhost:8000/playbook/

## Regenerating the OG cards

`og/card.html` is the template. Edit it, then re-render with Playwright at
1200x630, `device_scale_factor=2`, and downsample to 1200x630 for size.
Fonts load from `@fontsource` npm packages so the render matches the live site.

## The lead magnet PDF

`public/the-solo-builders-playbook.pdf` is generated from
`public/playbook/index.html` through its print stylesheet. The page is the
single source of truth: there is no separate PDF document to keep in sync, so
the web version and the PDF cannot drift.

Regenerate after any edit to the playbook page:

```
cd public && python3 -m http.server 8765 &
node og/render-pdf.mjs
```

`og/render-pdf.mjs` drives headless Chrome over the DevTools Protocol with no
dependencies. It opens every accordion, prints to A4, adds the running footer,
and writes the PDF metadata. Check the result before committing:

```
pdfinfo public/the-solo-builders-playbook.pdf
```

Nineteen A4 pages, ~1MB, real selectable text with the fonts subset and
embedded. The size is mostly the two full-bleed dark pages and the cover
gradient. Every page carries `reubendorje.com` in the footer, and the cover,
the sign-off and the closing block all link back, because the file is meant to
travel: most people who open it will have been forwarded it by a friend, not
downloaded it themselves.

### Delivering it from Loops

**Link to it, do not attach it.** A ~460K attachment on every signup hurts
deliverability, cannot be updated once sent, and gives you no idea whether
anyone opened it. A link costs nothing, always serves the current version, and
is measurable.

1. In Loops, create an automation with **Contact created** as the trigger,
   filtered to the source that the site form writes.
2. Add an email. Link the CTA to
   `https://reubendorje.com/the-solo-builders-playbook.pdf`.
3. Publish the automation. Until you do, the form creates contacts and sends
   nothing, which is the state the site is in today.

The PDF is served inline with `Content-Type: application/pdf`, so the link
opens in the browser's viewer rather than forcing a download.
