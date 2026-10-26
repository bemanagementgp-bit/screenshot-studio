# Screenshot Studio – Free Screenshot Mockup Generator

Turn plain screenshots into polished mockups: gradient / mesh / solid / transparent backgrounds, soft shadows, rounded corners, tilt, captions and Mac, Windows, browser or phone frames. Everything renders on a `<canvas>` in the user's browser; nothing is uploaded.

**Live:** https://__SITE_URL__/ (placeholder – replaced after deploy)

## Features

**Free**
- Drop / pick / paste a screenshot (PNG, JPG, WebP, GIF first frame, BMP). A built-in sample app window is shown until an image is loaded.
- 12 background presets (Sunset, Ocean, Aurora, Peach, Midnight, Lime, Candy, Slate, Mono, Solid, Transparent, Mesh) + custom two-color gradient with angle + optional noise grain
- Frames: None, Mac window, Windows window, Browser (editable URL), Phone bezel; frame color Auto (from screenshot brightness) / Light / Dark
- Layout: padding 0–200, corner radius 0–48, shadow strength + offset, image scale 50–100%, tilt -15..15°, inset border 0–8 px with color, aspect ratio Auto / 16:9 / 4:3 / 1:1 / 4:5 / 9:16
- Caption: title + subtitle above or below, font size, color, alignment
- Download PNG (1x), Download JPG (q92), Copy to clipboard; shortcuts Ctrl/Cmd+S and Ctrl/Cmd+C (canvas focused)
- 1 saved style preset; all settings persisted in `localStorage`
- Free exports carry a small "Screenshot Studio · free" badge (`Studio.watermark`)

**Pro (one-time, price from `config.js`)**
- No watermark
- 2x and 4x PNG exports
- 6 premium backgrounds (Nebula, Prism, Holo, Ember, Glacier, Velvet)
- Batch mode: drop many screenshots, same style applied to each, ZIP download (JSZip loaded lazily from jsDelivr)
- Unlimited saved style presets

Gates are enforced in `app.js` via `isPro()` / `Studio.gate()`; the UI listens to `pro:changed`.

## Files

```
index.html     tool page + SEO content + FAQ (JSON-LD WebApplication + FAQPage)
styles.css     _shared/base.css + app styles
app.js         rendering engine + UI (vanilla JS, no build step)
studio.js      shared canvas / drop zone / export / ZIP helpers (copy of _shared/studio.js)
monetize.js    shared theme / toast / analytics / AdSense / Pro license helpers
config.js      window.APP_CONFIG (site URL, AdSense, GA, checkout URL, price, LICENSE, NEWSLETTER)
privacy.html   privacy policy (required for AdSense)
terms.html     terms of use
robots.txt, sitemap.xml, vercel.json, favicon.svg, .gitignore
```

## Run locally

```bash
npx serve .
```

No build step. Open the printed URL.

## Deploy

Deploy the folder as a static site on Vercel (`vercel --prod`). After the first deploy, replace the placeholder everywhere:

```bash
sed -i 's/__SITE_URL__/shotstudio-tool.vercel.app/g' index.html privacy.html terms.html robots.txt sitemap.xml config.js README.md
```

Then run `node _shared/apply-brand.js screenshot-studio` from the repo root to inject the shared header, hero, footer and lead card.

## Monetization setup

1. **AdSense** – set `ADSENSE_CLIENT: "ca-pub-XXXXXXXXXXXXXXXX"` in `config.js`. Slots: `sidebar-1`, `below-tool`. `privacy.html` already discloses advertising cookies.
2. **Analytics** – set `GA_ID: "G-XXXXXXX"`. Events: `add_files`, `sample`, `bg_select`, `download` (format, scale), `copy`, `download_zip`, `preset_save`, `preset_apply`, `pro_click`, `begin_checkout`, `license_activated`.
3. **Pro checkout + licenses** – create a one-time product on Lemon Squeezy with license keys enabled, set `PRO_CHECKOUT_URL`, `PRO_PRICE` and `LICENSE.store_id` / `product_id`. Until those are set, real keys are refused and only `LICENSE.test_keys` work locally.
4. **Newsletter** – set `NEWSLETTER.url` (Formspree / ConvertKit / Beehiiv) to show the lead card that `apply-brand.js` injects.

## Notes

- Output canvas is capped at 4096 px on the longest side (1x); 2x/4x exports are further capped at 12000 px to stay inside browser canvas limits.
- Transparent background + JPG export falls back to a white background (JPEG has no alpha).
- The only external requests are Google Fonts, optional GA/AdSense, the Lemon Squeezy license API when a key is entered, and JSZip on batch export.
