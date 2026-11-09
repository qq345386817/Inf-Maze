# Infinity Maze website

Production: https://inf-maze.luopeike.com/ — Cloudflare Worker `inf-maze`, static assets only. The production worker and custom domain already exist. The website is its own Git repository, nested in the app checkout.

## Build, check, publish

```sh
node scripts/build-site.mjs
node scripts/validate-site.mjs
node scripts/package-site.mjs
npx wrangler deploy --dry-run
npx wrangler deploy
```

Wrangler publishes only `.public/`, an allowlist of rendered pages and referenced public assets. Source JSON, scripts, Git files, credentials and local QA artifacts are excluded. `_headers` and `_redirects` preserve security headers and clean/legacy URLs. A real 404 is served for unknown routes. CSS/JS/images use content fingerprints. Existing privacy policy HTML and its legacy CSS are preserved byte-for-byte by the build.

## Content and design

`content/website.json` supplies all nine homepage introductions, search/share metadata, play modes, and product questions and answers. Homepage and help sections share those mode/FAQ definitions; JSON-LD uses the same content. Current platform controls remain in `content/site-content.json`. `content/site-content.json` contains the existing support/help/policy source. `content/design-tokens.json` is the production copy of the `Infinity Maze` design system in the parent app workspace. Update the design system and production token copy together. No runtime component library or external fonts are required.

`style/site.css` implements the common homepage/help/support visual system. `script/gameplay.js` only selects real screenshots; it does not implement a playable game. The old `style/base.css` and `style/help.css` remain for the unchanged policy pages.

Gameplay images were derived from actual localized simulator captures of iOS 1.7.0 (105), not synthetic scenes. `content/gameplay-images.json` records source hashes, image dimensions and the text-free crop bounds. To regenerate when the app checkout has the source captures:

```sh
python3 scripts/prepare-gameplay.py \
  --source-dir ../ui-test-artifacts/four-maze-refresh-2026-10-19/raw \
  --app-icon '../InfiniteMaze Shared/Assets.xcassets/AppIcon.appiconset/icon-512.png'
```

Check desktop and 320/390px mobile layouts, Arabic RTL, screenshot switching, language navigation, help/support links and console errors before publishing. After publishing, independently read the deployed version and compare public routes/assets against `.wrangler/publish-manifest.json`. An upload receipt alone is not public verification.

## Content updates and search metadata

The 2026-11-09 content update aligns the website with the current ASO copy:
four maze shapes; Classic, Fewest Steps, Time Attack and No Backtrack; optional
fog; results and same-maze replay; offline core play with Game Center requiring
network access and sign-in; optional Pro. Keep deferred app features and unreleased
Duo optimization out of public claims. Existing screenshot provenance is retained.

`content/page-revisions.json` records content hashes and actual modification dates
for sitemap entries. A repeated build retains dates when content is unchanged; a
CSS/JS fingerprint change alone does not redate all pages. Existing privacy policy
HTML and its source text remain outside this update.

Validation checks visible modes/answers against JSON-LD, search and social
descriptions, real screenshot references, old rule claims, canonical/hreflang,
and sitemap dates. FAQs are useful product answers, without promising search
rich results, indexing, or AI citations.

References: [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide),
[SoftwareApplication](https://developers.google.com/search/docs/appearance/structured-data/software-app),
and [accurate sitemap dates](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
