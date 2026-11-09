import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".public", "node_modules"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.name.endsWith(".html")) htmlFiles.push(fullPath);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function internalFileForHref(href) {
  const pathname = href.split(/[?#]/, 1)[0];
  if (pathname === "/") return path.join(rootDir, "index.html");
  if (pathname.endsWith("/")) return path.join(rootDir, pathname.slice(1), "index.html");
  const directPath = path.join(rootDir, pathname.slice(1));
  return path.extname(directPath) ? directPath : `${directPath}.html`;
}

function expectedCanonical(file) {
  const relative = path.relative(rootDir, file).replaceAll(path.sep, "/");
  if (relative === "index.html") return "https://inf-maze.luopeike.com/";
  if (relative.endsWith("/index.html")) {
    return `https://inf-maze.luopeike.com/${relative.slice(0, -"index.html".length)}`;
  }
  return `https://inf-maze.luopeike.com/${relative.slice(0, -".html".length)}`;
}

walk(rootDir);
const sitePages = htmlFiles.filter((file) =>
  ["index.html", "help.html", "privacy-policy.html", "support.html"].includes(path.basename(file)),
);
assert(sitePages.length === 36, `Expected 36 localized site pages, found ${sitePages.length}`);

const titles = new Set();
const descriptions = new Set();

for (const file of sitePages) {
  const relative = path.relative(rootDir, file);
  const html = fs.readFileSync(file, "utf8");
  assert(/<html lang="[^"]+"/.test(html), `${relative}: missing language`);
  assert(/<title>[^<]+<\/title>/.test(html), `${relative}: missing title`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  assert(description, `${relative}: missing description`);
  assert(canonical === expectedCanonical(file), `${relative}: canonical does not match its clean URL`);
  assert(!titles.has(title), `${relative}: duplicate title ${title}`);
  assert(!descriptions.has(description), `${relative}: duplicate description`);
  titles.add(title);
  descriptions.add(description);
  assert(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'), `${relative}: wrong robots directive`);
  assert((html.match(/rel="alternate" hreflang=/g) || []).length === 10, `${relative}: incomplete hreflang set`);
  assert(html.includes('<meta property="og:image:width" content="512">'), `${relative}: missing social image dimensions`);
  assert((html.match(/<meta property="og:image:width"/g) || []).length === 1, `${relative}: duplicate social image width`);
  assert(html.includes('<meta name="twitter:image:alt" content="Infinity Maze app icon">'), `${relative}: missing social image alt text`);
  assert((html.match(/<h1/g) || []).length === 1, `${relative}: expected exactly one h1`);
  assert(/https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/infinity-maze\/id6608970522/.test(html), `${relative}: missing storefront-specific App Store link`);
  assert(!html.includes("https://apps.apple.com/app/id6608970522"), `${relative}: generic App Store link can lose the product destination`);
  assert(html.includes("/images/app-store-icon.svg"), `${relative}: missing App Store icon`);
  assert((html.match(/class="footer-languages"/g) || []).length === 1, `${relative}: missing crawlable language navigation`);
  assert((html.match(/<a href="[^"]+" hreflang="/g) || []).length === 9, `${relative}: incomplete crawlable language links`);
  assert(!/<a class="button[^"]*"[^>]+aria-label=/.test(html), `${relative}: button accessible name overrides its visible label`);
  assert(!html.includes("data-i18n"), `${relative}: client-side translated content remains`);

  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(schemaMatch, `${relative}: missing structured data`);
  JSON.parse(schemaMatch[1]);

  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const value = href[1];
    if (!value.startsWith("/") || value.startsWith("//")) continue;
    assert(!value.endsWith(".html"), `${relative}: internal link redirects instead of using canonical URL ${value}`);
    const localPath = internalFileForHref(value);
    assert(fs.existsSync(localPath), `${relative}: broken local link ${value}`);
  }
  for (const match of html.matchAll(/(?:src|data-gameplay-src)="(\/[^"]+)"/g)) {
    assert(fs.existsSync(path.join(rootDir, match[1].slice(1))), `${relative}: missing image or script ${match[1]}`);
  }
}

const copy = JSON.parse(fs.readFileSync(path.join(rootDir,"content/website.json"),"utf8"));
const images = JSON.parse(fs.readFileSync(path.join(rootDir,"content/gameplay-images.json"),"utf8"));
const escapeHtml = text => String(text).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const obsoleteRules = ["step limits", "countdowns", "Schrittlimit", "Countdown", "límite de pasos", "cuenta atrás", "limite de pas", "compte à rebours", "歩数制限", "カウントダウン", "걸음 수 제한", "카운트다운", "حدّ الخطوات", "العدّ التنازلي", "步数限制", "倒计时", "步數限制", "倒數計時"];
for (const [locale, text] of Object.entries(copy)) {
  const folder = {en:"",de:"de-DE",es:"es-ES",fr:"fr-FR"}[locale] ?? locale;
  const html = fs.readFileSync(path.join(rootDir,folder,"index.html"),"utf8");
  assert((html.match(/class="shape-card"/g)||[]).length===4, `${locale}: expected four maze shapes`);
  assert((html.match(/class="capture-choice"/g)||[]).length===4, `${locale}: expected four screenshot selectors`);
  assert(!html.includes('Infinity Maze 1.5'), `${locale}: obsolete homepage version`);
  assert(!html.includes('maze-preview'), `${locale}: obsolete illustrative maze`);
  for (const name of text.shapeNames) assert(html.includes(name), `${locale}: missing localized shape ${name}`);
  for (const image of Object.values(images.locales[locale])) assert(html.includes(image.src), `${locale}: missing actual localized capture`);
  if (locale==='ar') assert(html.includes('dir="rtl"'), 'Arabic page requires RTL');
  assert(text.modes.length === 4 && new Set(text.modes.map(mode => mode.name)).size === 4, `${locale}: expected four distinct play modes`);
  assert(text.faqs.length === 4, `${locale}: missing product questions and answers`);
  assert((html.match(/class="button(?: [^"]*)?"/g) || []).length === 2, `${locale}: homepage should have hero and closing download buttons`);
  for (const [page, expectedTitle, expectedDescription] of [["index.html", text.seoTitle, text.seoDescription], ["help.html", text.seoHelp, text.helpLead]]) {
    const rendered = fs.readFileSync(path.join(rootDir, folder, page), "utf8");
    assert(rendered.includes(`<title>${escapeHtml(expectedTitle)}</title>`), `${locale}/${page}: stale search title`);
    for (const tag of [`name="description"`, `property="og:description"`, `name="twitter:description"`]) {
      assert(rendered.includes(`${tag} content="${escapeHtml(expectedDescription)}"`), `${locale}/${page}: inconsistent search/share description`);
    }
    assert((rendered.match(/class="mode-card"/g) || []).length === 4, `${locale}/${page}: incomplete visible mode descriptions`);
    assert((rendered.match(/<details>/g) || []).length === 4, `${locale}/${page}: incomplete visible FAQ`);
    for (const mode of text.modes) {
      assert(rendered.includes(escapeHtml(mode.name)) && rendered.includes(escapeHtml(mode.body)), `${locale}/${page}: mode missing from visible content`);
    }
    for (const [question, answer] of text.faqs) {
      assert(rendered.includes(escapeHtml(question)) && rendered.includes(escapeHtml(answer)), `${locale}/${page}: FAQ missing from visible content`);
    }
    assert(rendered.includes(escapeHtml(text.fogBody)), `${locale}/${page}: missing fog explanation`);
    for (const phrase of obsoleteRules) assert(!rendered.includes(phrase), `${locale}/${page}: obsolete rule claim ${phrase}`);
    const schema = JSON.parse(rendered.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    if (page === "index.html") {
      assert(schema.description === text.intro, `${locale}: app description and visible introduction differ`);
      assert(schema.featureList.length >= 8 && schema.featureList.slice(0, 4).every((feature, index) => feature === `${text.modes[index].name}: ${text.modes[index].body}`), `${locale}: structured mode facts differ from the page`);
      assert(schema.screenshot.length === 4 && schema.screenshot.every(url => Object.values(images.locales[locale]).some(image => url.endsWith(image.src))), `${locale}: structured screenshots lack real capture provenance`);
      assert(!schema.aggregateRating, `${locale}: unverified rating added`);
    } else {
      for (const [question, answer] of text.faqs) assert(schema.mainEntity.some(entity => entity.name === question && entity.acceptedAnswer.text === answer), `${locale}: structured FAQ differs from visible answer`);
    }
  }
}

const sitemap = fs.readFileSync(path.join(rootDir, "sitemap.xml"), "utf8");
assert((sitemap.match(/<url>/g) || []).length === 36, "Sitemap must contain 36 URLs");
assert(sitemap.includes("https://inf-maze.luopeike.com/zh-Hans/privacy-policy"), "Sitemap is missing localized privacy pages");
assert(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), "Sitemap is missing the XHTML namespace");
assert((sitemap.match(/<xhtml:link /g) || []).length === 360, "Sitemap must list all language alternates for every URL");
const revisions = JSON.parse(fs.readFileSync(path.join(rootDir, "content/page-revisions.json"), "utf8"));
assert(Object.keys(revisions).length === 36, "Expected per-page content revision records");
for (const [, url, date] of sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
  assert(date === revisions[url]?.lastModified && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= new Date().toISOString().slice(0, 10), `${url}: inaccurate lastmod record`);
}

const robots = fs.readFileSync(path.join(rootDir, "robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://inf-maze.luopeike.com/sitemap.xml"), "robots.txt has the wrong sitemap URL");

const redirects = fs.readFileSync(path.join(rootDir, "_redirects"), "utf8").trim().split("\n");
assert(redirects[0] === "/google8bdd3bd447b6e703.html /google8bdd3bd447b6e703.txt 200", "Search ownership file must bypass automatic HTML redirects");
assert(redirects.length === 38, `Expected one ownership rewrite, one favicon redirect, and 36 permanent legacy redirects, found ${redirects.length}`);
assert(redirects[1] === `/favicon.ico ${images.brand.src} 301`, "Favicon compatibility URL must use the current app icon");
for (const redirect of redirects.slice(2)) {
  assert(/^\/[A-Za-z-]*(?:\/)?(?:index|help|privacy-policy|support)\.html \/[^ ]* 301$/.test(redirect), `Invalid redirect: ${redirect}`);
}

const verificationHtml = fs.readFileSync(path.join(rootDir, "google8bdd3bd447b6e703.html"), "utf8");
const verificationTarget = fs.readFileSync(path.join(rootDir, "google8bdd3bd447b6e703.txt"), "utf8").trimEnd();
assert(verificationHtml === verificationTarget, "Search ownership rewrite must preserve the exact verification token");
const {keyFile} = JSON.parse(fs.readFileSync(path.join(rootDir, "content/search-indexing.json"), "utf8"));
assert(/^[a-f0-9]{32}\.txt$/.test(keyFile), "Invalid IndexNow verification filename");
assert(fs.readFileSync(path.join(rootDir, keyFile), "utf8").trim() === keyFile.slice(0, -4), "IndexNow verification contents must match its filename");

const headers = fs.readFileSync(path.join(rootDir, "_headers"), "utf8");
assert(headers.includes("Strict-Transport-Security: max-age=31536000"), "Missing HSTS header");
assert(headers.includes("X-Content-Type-Options: nosniff"), "Missing nosniff header");
assert(headers.includes("Referrer-Policy: strict-origin-when-cross-origin"), "Missing referrer policy");

const assetsIgnore = fs.readFileSync(path.join(rootDir, ".assetsignore"), "utf8");
for (const privatePath of [".git", ".wrangler", "content", "scripts"]) {
  assert(assetsIgnore.split("\n").includes(privatePath), `.assetsignore must exclude ${privatePath}`);
}

const content = JSON.parse(fs.readFileSync(path.join(rootDir, "content", "site-content.json"), "utf8"));
for (const [locale, policy] of Object.entries(content.privacy)) {
  assert(policy.date.includes("2026") || policy.date.includes("٢٠٢٦"), `${locale}: privacy date was not updated`);
  assert(policy.sections[5][1].includes("1.5.0"), `${locale}: privacy analytics text is stale`);
}

console.log(`Validated ${sitePages.length} localized HTML pages, sitemap, robots.txt, structured data, and internal links.`);
