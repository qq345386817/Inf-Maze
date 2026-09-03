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

walk(rootDir);
assert(htmlFiles.length === 36, `Expected 36 HTML files, found ${htmlFiles.length}`);

for (const file of htmlFiles) {
  const relative = path.relative(rootDir, file);
  const html = fs.readFileSync(file, "utf8");
  assert(/<html lang="[^"]+"/.test(html), `${relative}: missing language`);
  assert(/<title>[^<]+<\/title>/.test(html), `${relative}: missing title`);
  assert(/<meta name="description" content="[^"]+">/.test(html), `${relative}: missing description`);
  assert(/<link rel="canonical" href="https:\/\/inf-maze\.luopeike\.com/.test(html), `${relative}: missing canonical`);
  assert((html.match(/rel="alternate" hreflang=/g) || []).length === 10, `${relative}: incomplete hreflang set`);
  assert((html.match(/<h1/g) || []).length === 1, `${relative}: expected exactly one h1`);
  assert(html.includes("https://apps.apple.com/app/id6608970522"), `${relative}: missing App Store link`);
  assert(html.includes("/images/app-store-icon.svg"), `${relative}: missing App Store icon`);
  assert(!html.includes("data-i18n"), `${relative}: client-side translated content remains`);

  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(schemaMatch, `${relative}: missing structured data`);
  JSON.parse(schemaMatch[1]);

  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const value = href[1];
    if (!value.startsWith("/") || value.startsWith("//")) continue;
    const localPath = path.join(rootDir, value.slice(1));
    assert(fs.existsSync(localPath), `${relative}: broken local link ${value}`);
  }
}

const sitemap = fs.readFileSync(path.join(rootDir, "sitemap.xml"), "utf8");
assert((sitemap.match(/<url>/g) || []).length === 36, "Sitemap must contain 36 URLs");
assert(sitemap.includes("https://inf-maze.luopeike.com/zh-Hans/privacy-policy"), "Sitemap is missing localized privacy pages");

const robots = fs.readFileSync(path.join(rootDir, "robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://inf-maze.luopeike.com/sitemap.xml"), "robots.txt has the wrong sitemap URL");

const content = JSON.parse(fs.readFileSync(path.join(rootDir, "content", "site-content.json"), "utf8"));
for (const [locale, policy] of Object.entries(content.privacy)) {
  assert(policy.date.includes("2026") || policy.date.includes("٢٠٢٦"), `${locale}: privacy date was not updated`);
  assert(policy.sections[5][1].includes("1.5.0"), `${locale}: privacy analytics text is stale`);
}

console.log(`Validated ${htmlFiles.length} localized HTML pages, sitemap, robots.txt, structured data, and internal links.`);
