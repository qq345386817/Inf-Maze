import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
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
  assert(html.includes('<meta name="twitter:image:alt" content="Infinity Maze app icon">'), `${relative}: missing social image alt text`);
  assert((html.match(/<h1/g) || []).length === 1, `${relative}: expected exactly one h1`);
  assert(/https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/infinity-maze\/id6608970522/.test(html), `${relative}: missing storefront-specific App Store link`);
  assert(!html.includes("https://apps.apple.com/app/id6608970522"), `${relative}: generic App Store link can lose the product destination`);
  assert(html.includes("/images/app-store-icon.svg"), `${relative}: missing App Store icon`);
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
}

const sitemap = fs.readFileSync(path.join(rootDir, "sitemap.xml"), "utf8");
assert((sitemap.match(/<url>/g) || []).length === 36, "Sitemap must contain 36 URLs");
assert(sitemap.includes("https://inf-maze.luopeike.com/zh-Hans/privacy-policy"), "Sitemap is missing localized privacy pages");

const robots = fs.readFileSync(path.join(rootDir, "robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://inf-maze.luopeike.com/sitemap.xml"), "robots.txt has the wrong sitemap URL");

const redirects = fs.readFileSync(path.join(rootDir, "_redirects"), "utf8").trim().split("\n");
assert(redirects.length === 36, `Expected 36 permanent legacy redirects, found ${redirects.length}`);
for (const redirect of redirects) {
  assert(/^\/[A-Za-z-]*(?:\/)?(?:index|help|privacy-policy|support)\.html \/[^ ]* 301$/.test(redirect), `Invalid redirect: ${redirect}`);
}

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
