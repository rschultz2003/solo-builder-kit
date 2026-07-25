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
    ├── playbook/
    │   └── index.html   The Solo Builder's Playbook (web version)
    ├── og.png           1200x630 social card — home
    ├── og-playbook.png  1200x630 social card — playbook
    ├── robots.txt
    └── sitemap.xml
```

## Before it goes live

Three things, in order:

1. **Connect the form.** Loops.so → Forms → create form → copy the endpoint
   (`https://app.loops.so/api/newsletter-form/XXXXXXXX`).
   Paste it into `FORM_ENDPOINT` at the top of the `<script>` block in **both**
   `public/index.html` and `public/playbook/index.html`. The two values must match.

   Until it is set, the form fails loudly with a visible message rather than
   silently swallowing signups. That is intentional. Do not ship without it.

2. **Fill the playbook gaps.** `public/playbook/index.html` has principles 01 and 02
   written. Principles 03 to 05 and Parts 02 onward are placeholders, marked with a
   `.todo` block. Paste the real content, delete the `.todo` block.

3. **Add a favicon.** Not present yet.

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
