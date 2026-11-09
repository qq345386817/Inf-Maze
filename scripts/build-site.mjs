import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const contentPath = path.join(rootDir, "content", "site-content.json");
const baseUrl = "https://inf-maze.luopeike.com";
const supportEmail = "cameoshell09@gmail.com";
const website = JSON.parse(fs.readFileSync(path.join(rootDir, "content/website.json"), "utf8"));
const gameplay = JSON.parse(fs.readFileSync(path.join(rootDir, "content/gameplay-images.json"), "utf8"));
const tokens = JSON.parse(fs.readFileSync(path.join(rootDir, "content/design-tokens.json"), "utf8"));
const revisionsPath = path.join(rootDir, "content/page-revisions.json");
const revisions = fs.existsSync(revisionsPath) ? JSON.parse(fs.readFileSync(revisionsPath, "utf8")) : {};
const previousDates = new Map([...fs.readFileSync(path.join(rootDir, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map(([, url, date]) => [url, date]));
const today = new Date().toISOString().slice(0, 10);

function contentHash(html) {
  // A CSS/JS fingerprint changing alone does not date every page as new content.
  const normalized = html.replace(/\/(style|script)\/generated\/([\w-]+)\.[a-f0-9]{12}\.(css|js)/g, "/$1/generated/$2.$3");
  return createHash("sha256").update(normalized).digest("hex");
}

function recordPage(locale, pageKey, html) {
  const url = `${baseUrl}${pagePath(locale, pageKey)}`;
  const hash = contentHash(html);
  const previous = revisions[url];
  const existingFile = path.join(rootDir, locale.folder, pages[pageKey].file);
  const unchanged = previous ? previous.hash === hash : fs.existsSync(existingFile) && contentHash(fs.readFileSync(existingFile, "utf8")) === hash;
  revisions[url] = { hash, lastModified: unchanged ? previous?.lastModified ?? previousDates.get(url) ?? today : today };
}
const tokenCss = `:root{${tokens.color.tokens.map(t => `--${t.name}:${t.value};`).join("")}${["spacing","radius"].flatMap(f => tokens[f].tokens.map(t => `--${t.name}:${t.value};`)).join("")}${Object.entries(tokens.type.families).map(([name,value]) => `--font-${name}:${value};`).join("")}}\n`;
function fingerprint(folder, name, ext, source) {
  const hash = createHash("sha256").update(source).digest("hex").slice(0,12);
  const dir = path.join(rootDir, folder, "generated");
  fs.mkdirSync(dir, {recursive:true});
  const file = `${name}.${hash}.${ext}`;
  fs.writeFileSync(path.join(dir,file), source);
  return `/${folder}/generated/${file}`;
}
const websiteCss = fingerprint("style", "site", "css", tokenCss + fs.readFileSync(path.join(rootDir,"style/site.css"),"utf8"));
const websiteJs = fingerprint("script", "gameplay", "js", fs.readFileSync(path.join(rootDir,"script/gameplay.js"),"utf8"));

const locales = [
  { key: "en", folder: "", htmlLang: "en", hreflang: "en", ogLocale: "en_US", label: "English" },
  { key: "ar", folder: "ar", htmlLang: "ar", hreflang: "ar", ogLocale: "ar_AR", label: "العربية", dir: "rtl" },
  { key: "de", folder: "de-DE", htmlLang: "de-DE", hreflang: "de", ogLocale: "de_DE", label: "Deutsch" },
  { key: "es", folder: "es-ES", htmlLang: "es-ES", hreflang: "es", ogLocale: "es_ES", label: "Español" },
  { key: "fr", folder: "fr-FR", htmlLang: "fr-FR", hreflang: "fr", ogLocale: "fr_FR", label: "Français" },
  { key: "ja", folder: "ja", htmlLang: "ja", hreflang: "ja", ogLocale: "ja_JP", label: "日本語" },
  { key: "ko", folder: "ko", htmlLang: "ko", hreflang: "ko", ogLocale: "ko_KR", label: "한국어" },
  { key: "zh-Hans", folder: "zh-Hans", htmlLang: "zh-Hans", hreflang: "zh-Hans", ogLocale: "zh_CN", label: "简体中文" },
  { key: "zh-Hant", folder: "zh-Hant", htmlLang: "zh-Hant", hreflang: "zh-Hant", ogLocale: "zh_TW", label: "繁體中文" },
];

const appStorefronts = {
  en: "us",
  ar: "sa",
  de: "de",
  es: "es",
  fr: "fr",
  ja: "jp",
  ko: "kr",
  "zh-Hans": "us",
  "zh-Hant": "tw",
};

function appStoreUrl(locale) {
  return `https://apps.apple.com/${appStorefronts[locale.key]}/app/infinity-maze/id6608970522`;
}

const ui = {
  en: { home: "Home", help: "Help", privacy: "Privacy", support: "Support", language: "Language", download: "Download on the App Store", eyebrow: "Endless procedural maze game", title: "Infinity Maze", explore: "A new route every time", exploreBody: "Generate rectangular, hexagonal, and honeycomb mazes across four difficulty levels. Play a quick round or settle into a harder spatial puzzle.", platforms: "One maze, all your Apple devices", platformsBody: "Built for iPhone, iPad, Mac, and Apple TV, with offline play and controls designed for each screen.", featuresTitle: "A focused maze game with room to grow", supportTitle: "Infinity Maze Support", supportLead: "Get help with gameplay, purchases, Game Center, or accessibility.", emailTitle: "Contact support", emailBody: "Describe the device, system version, and what happened. We usually reply by email.", resourcesTitle: "Quick resources", copyright: "Infinity Maze — endless procedural mazes for Apple devices.", seoHome: "Infinity Maze | Endless procedural maze game for Apple devices", seoHelp: "Infinity Maze Help | How to play on iPhone, Mac, and Apple TV", seoPrivacy: "Infinity Maze Privacy Policy", seoSupport: "Infinity Maze Support", privacyLead: "How Infinity Maze handles local game data and first-party product analytics.", helpLead: "Movement, maze types, difficulty, scoring, Pro benefits, and platform controls.", storeAria: "Download Infinity Maze on the App Store" },
  ar: { home: "الرئيسية", help: "المساعدة", privacy: "الخصوصية", support: "الدعم", language: "اللغة", download: "تنزيل من App Store", eyebrow: "لعبة متاهة إجرائية لا نهائية", title: "Infinity Maze", explore: "مسار جديد في كل مرة", exploreBody: "أنشئ متاهات مستطيلة وسداسية وشبيهة بقرص العسل عبر أربعة مستويات صعوبة.", platforms: "متاهة واحدة على جميع أجهزة Apple", platformsBody: "مصممة لـ iPhone وiPad وMac وApple TV، مع لعب دون اتصال وتحكم مناسب لكل شاشة.", featuresTitle: "لعبة متاهة هادئة مع تحديات متجددة", supportTitle: "دعم Infinity Maze", supportLead: "احصل على مساعدة بشأن اللعب أو المشتريات أو Game Center أو تسهيلات الاستخدام.", emailTitle: "تواصل مع الدعم", emailBody: "اذكر الجهاز وإصدار النظام وما حدث. نرد عادةً عبر البريد الإلكتروني.", resourcesTitle: "روابط سريعة", copyright: "Infinity Maze — متاهات إجرائية لا نهائية لأجهزة Apple.", seoHome: "Infinity Maze | لعبة متاهة لا نهائية لأجهزة Apple", seoHelp: "مساعدة Infinity Maze | طريقة اللعب", seoPrivacy: "سياسة خصوصية Infinity Maze", seoSupport: "دعم Infinity Maze", privacyLead: "كيفية تعامل Infinity Maze مع بيانات اللعبة المحلية وتحليلات المنتج.", helpLead: "الحركة وأنواع المتاهة والصعوبة والنقاط ومزايا Pro وعناصر التحكم.", storeAria: "تنزيل Infinity Maze من App Store" },
  de: { home: "Start", help: "Hilfe", privacy: "Datenschutz", support: "Support", language: "Sprache", download: "Im App Store laden", eyebrow: "Endloses prozedurales Labyrinthspiel", title: "Infinity Maze", explore: "Jedes Mal ein neuer Weg", exploreBody: "Erzeuge rechteckige, hexagonale und Honeycomb-Labyrinthe in vier Schwierigkeitsstufen.", platforms: "Ein Labyrinth auf allen Apple-Geräten", platformsBody: "Für iPhone, iPad, Mac und Apple TV entwickelt — offline spielbar und mit passenden Steuerelementen.", featuresTitle: "Ein fokussiertes Labyrinthspiel mit neuen Herausforderungen", supportTitle: "Infinity Maze Support", supportLead: "Hilfe zu Spiel, Käufen, Game Center oder Bedienungshilfen.", emailTitle: "Support kontaktieren", emailBody: "Nenne Gerät, Systemversion und was passiert ist. Wir antworten in der Regel per E-Mail.", resourcesTitle: "Schnellzugriff", copyright: "Infinity Maze — endlose prozedurale Labyrinthe für Apple-Geräte.", seoHome: "Infinity Maze | Endloses Labyrinthspiel für Apple-Geräte", seoHelp: "Infinity Maze Hilfe | Spielen auf iPhone, Mac und Apple TV", seoPrivacy: "Infinity Maze Datenschutzrichtlinie", seoSupport: "Infinity Maze Hilfe & Support", privacyLead: "Wie Infinity Maze lokale Spieldaten und First-Party-Produktanalysen verarbeitet.", helpLead: "Bewegung, Labyrinthtypen, Schwierigkeit, Punkte, Pro-Vorteile und Steuerung.", storeAria: "Infinity Maze im App Store laden" },
  es: { home: "Inicio", help: "Ayuda", privacy: "Privacidad", support: "Soporte", language: "Idioma", download: "Descargar en App Store", eyebrow: "Juego de laberintos procedurales infinitos", title: "Infinity Maze", explore: "Una ruta nueva en cada partida", exploreBody: "Genera laberintos rectangulares, hexagonales y Honeycomb con cuatro niveles de dificultad.", platforms: "Un laberinto en todos tus dispositivos Apple", platformsBody: "Diseñado para iPhone, iPad, Mac y Apple TV, con juego sin conexión y controles adaptados.", featuresTitle: "Un juego de laberintos centrado y siempre renovado", supportTitle: "Soporte de Infinity Maze", supportLead: "Obtén ayuda con el juego, las compras, Game Center o la accesibilidad.", emailTitle: "Contactar con soporte", emailBody: "Indica el dispositivo, la versión del sistema y qué ocurrió. Solemos responder por correo.", resourcesTitle: "Recursos rápidos", copyright: "Infinity Maze — laberintos procedurales infinitos para dispositivos Apple.", seoHome: "Infinity Maze | Juego de laberintos infinitos para Apple", seoHelp: "Ayuda de Infinity Maze | Cómo jugar", seoPrivacy: "Política de privacidad de Infinity Maze", seoSupport: "Soporte de Infinity Maze", privacyLead: "Cómo gestiona Infinity Maze los datos locales y el análisis propio del producto.", helpLead: "Movimiento, tipos de laberinto, dificultad, puntos, ventajas Pro y controles.", storeAria: "Descargar Infinity Maze en App Store" },
  fr: { home: "Accueil", help: "Aide", privacy: "Confidentialité", support: "Assistance", language: "Langue", download: "Télécharger dans l’App Store", eyebrow: "Jeu de labyrinthes procéduraux infinis", title: "Infinity Maze", explore: "Un nouveau chemin à chaque partie", exploreBody: "Générez des labyrinthes rectangulaires, hexagonaux et Honeycomb avec quatre niveaux de difficulté.", platforms: "Un labyrinthe sur tous vos appareils Apple", platformsBody: "Conçu pour iPhone, iPad, Mac et Apple TV, jouable hors ligne avec des commandes adaptées.", featuresTitle: "Un jeu de labyrinthe concentré et renouvelé", supportTitle: "Assistance Infinity Maze", supportLead: "Obtenez de l’aide pour le jeu, les achats, Game Center ou l’accessibilité.", emailTitle: "Contacter l’assistance", emailBody: "Indiquez l’appareil, la version du système et le problème rencontré. Nous répondons généralement par e-mail.", resourcesTitle: "Ressources rapides", copyright: "Infinity Maze — labyrinthes procéduraux infinis pour appareils Apple.", seoHome: "Infinity Maze | Jeu de labyrinthes infinis pour Apple", seoHelp: "Aide Infinity Maze | Jouer sur iPhone, Mac et Apple TV", seoPrivacy: "Politique de confidentialité Infinity Maze", seoSupport: "Assistance Infinity Maze", privacyLead: "Comment Infinity Maze traite les données locales et les analyses produit internes.", helpLead: "Déplacements, types de labyrinthes, difficulté, points, avantages Pro et commandes.", storeAria: "Télécharger Infinity Maze dans l’App Store" },
  ja: { home: "ホーム", help: "ヘルプ", privacy: "プライバシー", support: "サポート", language: "言語", download: "App Storeからダウンロード", eyebrow: "無限に遊べる自動生成迷路ゲーム", title: "Infinity Maze", explore: "遊ぶたびに新しいルート", exploreBody: "長方形、六角形、Honeycomb の迷路を4段階の難易度で自動生成します。", platforms: "すべてのAppleデバイスで迷路を", platformsBody: "iPhone、iPad、Mac、Apple TV向け。オフラインで遊べ、各画面に合った操作ができます。", featuresTitle: "集中して楽しめる、何度でも新しい迷路", supportTitle: "Infinity Maze サポート", supportLead: "ゲームプレイ、購入、Game Center、アクセシビリティについてご案内します。", emailTitle: "サポートに問い合わせる", emailBody: "デバイス、OSバージョン、発生した内容をお知らせください。通常はメールで返信します。", resourcesTitle: "クイックリンク", copyright: "Infinity Maze — Appleデバイス向けの無限自動生成迷路。", seoHome: "Infinity Maze | Appleデバイス向け無限迷路ゲーム", seoHelp: "Infinity Maze ヘルプ | 遊び方", seoPrivacy: "Infinity Maze プライバシーポリシー", seoSupport: "Infinity Maze サポート", privacyLead: "Infinity Mazeのローカルゲームデータと製品分析の取り扱いについて。", helpLead: "移動、迷路タイプ、難易度、スコア、Pro特典、各デバイスの操作方法。", storeAria: "App StoreでInfinity Mazeをダウンロード" },
  ko: { home: "홈", help: "도움말", privacy: "개인정보", support: "지원", language: "언어", download: "App Store에서 다운로드", eyebrow: "끝없이 즐기는 절차적 미로 게임", title: "Infinity Maze", explore: "플레이할 때마다 새로운 길", exploreBody: "직사각형, 육각형, Honeycomb 미로를 네 가지 난이도로 생성합니다.", platforms: "모든 Apple 기기에서 즐기는 미로", platformsBody: "iPhone, iPad, Mac, Apple TV용으로 설계되었으며 오프라인 플레이와 기기별 조작을 지원합니다.", featuresTitle: "집중해서 즐기는 계속 새로운 미로", supportTitle: "Infinity Maze 지원", supportLead: "게임, 구입, Game Center 또는 손쉬운 사용에 대한 도움을 받으세요.", emailTitle: "지원팀 문의", emailBody: "기기, 시스템 버전, 발생한 상황을 알려 주세요. 일반적으로 이메일로 답변합니다.", resourcesTitle: "빠른 링크", copyright: "Infinity Maze — Apple 기기를 위한 무한 절차적 미로.", seoHome: "Infinity Maze | Apple 기기용 무한 미로 게임", seoHelp: "Infinity Maze 도움말 | 플레이 방법", seoPrivacy: "Infinity Maze 개인정보 처리방침", seoSupport: "Infinity Maze 지원", privacyLead: "Infinity Maze가 로컬 게임 데이터와 자사 제품 분석을 처리하는 방식입니다.", helpLead: "이동, 미로 유형, 난이도, 점수, Pro 혜택 및 기기별 조작 방법.", storeAria: "App Store에서 Infinity Maze 다운로드" },
  "zh-Hans": { home: "首页", help: "帮助", privacy: "隐私", support: "支持", language: "语言", download: "前往 App Store 下载", eyebrow: "无限程序生成迷宫游戏", title: "Infinity Maze", explore: "每一局，都是一条新路线", exploreBody: "程序生成矩形、六边形和蜂巢迷宫，提供四档难度；既适合快速专注，也适合挑战空间推理。", platforms: "一个迷宫，覆盖所有 Apple 设备", platformsBody: "适配 iPhone、iPad、Mac 和 Apple TV，支持离线游玩，并针对不同屏幕设计操作方式。", featuresTitle: "专注、轻松，又能不断挑战的迷宫", supportTitle: "Infinity Maze 支持", supportLead: "获取游戏操作、购买、Game Center 或辅助功能方面的帮助。", emailTitle: "联系支持", emailBody: "请说明设备、系统版本和遇到的情况，我们通常会通过邮件回复。", resourcesTitle: "快捷资源", copyright: "Infinity Maze — 面向 Apple 设备的无限程序生成迷宫。", seoHome: "Infinity Maze｜适用于 Apple 设备的无限迷宫游戏", seoHelp: "Infinity Maze 帮助｜iPhone、Mac 与 Apple TV 操作指南", seoPrivacy: "Infinity Maze 隐私政策", seoSupport: "Infinity Maze 支持", privacyLead: "了解 Infinity Maze 如何处理本地游戏数据和第一方产品分析。", helpLead: "查看移动方式、迷宫类型、难度、积分、Pro 权益和各平台操作。", storeAria: "在 App Store 下载 Infinity Maze" },
  "zh-Hant": { home: "首頁", help: "幫助", privacy: "隱私", support: "支援", language: "語言", download: "前往 App Store 下載", eyebrow: "無限程式生成迷宮遊戲", title: "Infinity Maze", explore: "每一局，都是一條新路線", exploreBody: "程式生成矩形、六邊形和蜂巢迷宮，提供四種難度；適合快速專注，也適合挑戰空間推理。", platforms: "一個迷宮，涵蓋所有 Apple 裝置", platformsBody: "適配 iPhone、iPad、Mac 和 Apple TV，支援離線遊玩，並針對不同螢幕設計操作方式。", featuresTitle: "專注、輕鬆，又能不斷挑戰的迷宮", supportTitle: "Infinity Maze 支援", supportLead: "取得遊戲操作、購買、Game Center 或輔助功能方面的協助。", emailTitle: "聯絡支援", emailBody: "請說明裝置、系統版本和遇到的情況，我們通常會透過電子郵件回覆。", resourcesTitle: "快捷資源", copyright: "Infinity Maze — 適用於 Apple 裝置的無限程式生成迷宮。", seoHome: "Infinity Maze｜適用於 Apple 裝置的無限迷宮遊戲", seoHelp: "Infinity Maze 幫助｜iPhone、Mac 與 Apple TV 操作指南", seoPrivacy: "Infinity Maze 隱私政策", seoSupport: "Infinity Maze 支援", privacyLead: "了解 Infinity Maze 如何處理本機遊戲資料和第一方產品分析。", helpLead: "查看移動方式、迷宮類型、難度、積分、Pro 權益和各平台操作。", storeAria: "在 App Store 下載 Infinity Maze" },
};

function extractObject(source, variableName) {
  const marker = `const ${variableName} =`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing ${variableName}`);
  const start = source.indexOf("{", markerIndex + marker.length);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) {
      const literal = source.slice(start, index + 1);
      return Function(`"use strict"; return (${literal});`)();
    }
  }
  throw new Error(`Unterminated ${variableName}`);
}

function bootstrapContent() {
  const homeSource = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const helpSource = fs.readFileSync(path.join(rootDir, "help.html"), "utf8");
  const privacySource = fs.readFileSync(path.join(rootDir, "privacy-policy.html"), "utf8");
  const content = {
    home: extractObject(homeSource, "translations"),
    help: extractObject(helpSource, "translations"),
    privacy: extractObject(privacySource, "translations"),
  };
  const analyticsUpdates = extractObject(privacySource, "analyticsPolicyUpdates");
  for (const [language, update] of Object.entries(analyticsUpdates)) {
    content.privacy[language].date = update.date;
    content.privacy[language].sections[5][1] = update.body;
  }
  fs.mkdirSync(path.dirname(contentPath), { recursive: true });
  fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`);
  return content;
}

const content = fs.existsSync(contentPath)
  ? JSON.parse(fs.readFileSync(contentPath, "utf8"))
  : bootstrapContent();

const pages = {
  home: { file: "index.html", slug: "" },
  help: { file: "help.html", slug: "help" },
  privacy: { file: "privacy-policy.html", slug: "privacy-policy" },
  support: { file: "support.html", slug: "support" },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pagePath(locale, pageKey) {
  const prefix = locale.folder ? `/${locale.folder}` : "";
  if (pageKey === "home") return `${prefix}/`;
  return `${prefix}/${pages[pageKey].slug}`;
}

function legacyPagePath(locale, pageKey) {
  const prefix = locale.folder ? `/${locale.folder}` : "";
  if (pageKey === "home") return `${prefix}/index.html`;
  return `${prefix}/${pages[pageKey].file}`;
}

function alternateLinks(pageKey) {
  const links = locales.map((locale) =>
    `  <link rel="alternate" hreflang="${locale.hreflang}" href="${baseUrl}${pagePath(locale, pageKey)}">`,
  );
  links.push(`  <link rel="alternate" hreflang="x-default" href="${baseUrl}${pagePath(locales[0], pageKey)}">`);
  return links.join("\n");
}

function languageOptions(currentLocale, pageKey) {
  return locales.map((locale) => {
    const selected = locale.key === currentLocale.key ? " selected" : "";
    return `<option value="${pagePath(locale, pageKey)}"${selected}>${escapeHtml(locale.label)}</option>`;
  }).join("");
}

function languageLinks(currentLocale, pageKey) {
  return locales.map((locale) => {
    const current = locale.key === currentLocale.key ? ' aria-current="page"' : "";
    return `<a href="${pagePath(locale, pageKey)}" hreflang="${locale.hreflang}" lang="${locale.htmlLang}"${current}>${escapeHtml(locale.label)}</a>`;
  }).join("");
}

function header(locale, pageKey) {
  const t = ui[locale.key];
  const nav = ["home", "help", "support", "privacy"].map((key) => {
    const current = key === pageKey ? ' aria-current="page"' : "";
    return `<a href="${pagePath(locale, key)}"${current}>${escapeHtml(t[key])}</a>`;
  }).join("");
  return `<header class="topbar">
  <a class="brand" href="${pagePath(locale, "home")}" aria-label="Infinity Maze ${escapeHtml(t.home)}">
    <img src="${pageKey === "privacy" ? "/favicon/apple-touch-icon.png" : gameplay.brand.src}" alt="" width="44" height="44">
    <span>Infinity Maze</span>
  </a>
  <nav class="nav" aria-label="${escapeHtml(t.language)}">${nav}
    <label class="language-switch"><span>${escapeHtml(t.language)}</span><select aria-label="${escapeHtml(t.language)}" onchange="if (this.value) window.location.href=this.value">${languageOptions(locale, pageKey)}</select></label>
  </nav>
</header>`;
}

function storeButton(locale, compact = false) {
  const t = ui[locale.key];
  return `<a class="button primary${compact ? " compact" : ""}" href="${appStoreUrl(locale)}"><img class="store-icon" src="/images/app-store-icon.svg" alt="" width="24" height="24"><span>${escapeHtml(t.download)}</span></a>`;
}

function footer(locale, pageKey) {
  const t = ui[locale.key];
  return `<footer class="footer">
  <div class="footer-main"><div><strong>Infinity Maze</strong><p>${escapeHtml(t.copyright)}</p></div>${pageKey === "home" ? "" : storeButton(locale, true)}</div>
  <nav class="footer-languages" aria-label="${escapeHtml(t.language)}"><span>${escapeHtml(t.language)}</span><div>${languageLinks(locale, pageKey)}</div></nav>
</footer>`;
}

function documentHead(locale, pageKey, title, description, schema) {
  const canonical = `${baseUrl}${pagePath(locale, pageKey)}`;
  return `<!DOCTYPE html>
<html lang="${locale.htmlLang}"${locale.dir ? ` dir="${locale.dir}"` : ""}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="${pageKey === "privacy" ? "#101337" : "#080d17"}">
  <meta name="apple-itunes-app" content="app-id=6608970522">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${baseUrl}${pageKey === "privacy" ? "/favicon/android-chrome-512x512.png" : gameplay.brand.src}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="Infinity Maze app icon">
  <meta property="og:site_name" content="Infinity Maze">
  <meta property="og:locale" content="${locale.ogLocale}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${baseUrl}${pageKey === "privacy" ? "/favicon/android-chrome-512x512.png" : gameplay.brand.src}">
  <meta name="twitter:image:alt" content="Infinity Maze app icon">
  <link rel="canonical" href="${canonical}">
${alternateLinks(pageKey)}
  ${pageKey === "privacy" ? '<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">\n  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">\n  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">' : `<link rel="apple-touch-icon" href="${gameplay.brand.src}">\n  <link rel="icon" type="image/png" sizes="512x512" href="${gameplay.brand.src}">`}
  <link rel="manifest" href="/favicon/site.webmanifest">
  ${pageKey === "privacy" ? '<link rel="stylesheet" href="/style/base.css">\n  <link rel="stylesheet" href="/style/help.css">' : `<link rel="stylesheet" href="${websiteCss}">`}
  <title>${escapeHtml(title)}</title>
  <script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>
</head>`;
}

const shapes = ["rectangular", "hexagonal", "honeycomb", "circular"];
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
function gameImage(asset, alt, className, eager = false) {
  return `<img class="${className}" src="${asset.src}" alt="${escapeHtml(alt)}" width="${asset.width}" height="${asset.height}" ${eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async">`;
}

function renderModes(locale) {
  const text = website[locale.key];
  return `<section class="section" id="play-modes" aria-labelledby="modes-title">
    <div class="section-intro"><h2 id="modes-title">${escapeHtml(text.modesTitle)}</h2><p>${escapeHtml(text.modesIntro)}</p></div>
    <div class="mode-grid">${text.modes.map((mode, index) => `<article class="mode-card"><span class="card-index">0${index + 1}</span><h3>${escapeHtml(mode.name)}</h3><p>${escapeHtml(mode.body)}</p></article>`).join("")}</div>
    <p class="section-note">${escapeHtml(text.fogBody)}</p>
  </section>`;
}

function renderFaq(locale, includeHelpLink = false) {
  const text = website[locale.key];
  return `<section class="section" aria-labelledby="faq-title">
    <div class="section-intro"><h2 id="faq-title">${escapeHtml(text.faqTitle)}</h2></div>
    <div class="faq-list">${text.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}<span class="faq-toggle" aria-hidden="true">+</span></summary><p>${escapeHtml(answer)}</p></details>`).join("")}</div>
${includeHelpLink ? `<a class="text-action" href="${pagePath(locale, "help")}">${escapeHtml(ui[locale.key].help)}${arrow}</a>` : ""}
  </section>`;
}

function renderHome(locale) {
  const t = ui[locale.key];
  const home = website[locale.key];
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${baseUrl}/#app`,
    name: "Infinity Maze",
    applicationCategory: "GameApplication",
    operatingSystem: "iOS, iPadOS, macOS, tvOS",
    inLanguage: locale.htmlLang,
    description: home.intro,
    featureList: [...home.modes.map(mode => `${mode.name}: ${mode.body}`), home.fogBody, ...home.featureBodies],
    screenshot: shapes.map(shape => `${baseUrl}${gameplay.locales[locale.key][shape].src}`),
    url: `${baseUrl}${pagePath(locale, "home")}`,
    downloadUrl: appStoreUrl(locale),
    installUrl: appStoreUrl(locale),
    image: `${baseUrl}${gameplay.brand.src}`,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return `${documentHead(locale, "home", home.seoTitle, home.seoDescription, schema)}
<body class="home-page">
<a class="skip-link" href="#main">${escapeHtml(home.skip)}</a>
<div class="page"><div class="container">
${header(locale, "home")}
<main id="main">
  <section class="hero">
    <div class="hero-copy">
      <p class="kicker">${escapeHtml(home.eyebrow)}</p>
      <h1>${home.headline.map(line=>`<span>${escapeHtml(line)}</span>`).join("")}</h1>
      <p class="lead">${escapeHtml(home.intro)}</p>
      <div class="actions">${storeButton(locale)}<a class="text-action" href="#shapes">${escapeHtml(home.shapesLink)}${arrow}</a></div>
      <p class="platform-note">iPhone · iPad · Mac · Apple TV</p>
    </div>
    <figure class="hero-visual">${gameImage(gameplay.crops.circular,home.shapeNames[3],"hero-image",true)}<figcaption class="image-caption"><span>04 / ${escapeHtml(home.shapeNames[3])}</span><span>${escapeHtml(home.capture)}</span></figcaption></figure>
  </section>
  <section class="section" id="shapes" aria-labelledby="shapes-title">
    <div class="section-intro"><div><p class="section-number">01 / ${escapeHtml(home.shapeEyebrow)}</p><h2 id="shapes-title">${escapeHtml(home.shapeTitle)}</h2></div><p>${escapeHtml(home.shapeIntro)}</p></div>
    <div class="shape-grid">${shapes.map((shape,i)=>`<article class="shape-card">${gameImage(gameplay.crops[shape],home.shapeNames[i],"shape-image")}<header><h3>${escapeHtml(home.shapeNames[i])}</h3><span>0${i+1}</span></header><p>${escapeHtml(home.shapeBodies[i])}</p></article>`).join("")}</div>
  </section>
  <section class="section" aria-labelledby="pace-title">
    <div class="challenge">
      <div class="capture-panel" data-gameplay-gallery>
        <figure>${gameImage(gameplay.locales[locale.key].circular,`${home.shapeNames[3]} — ${home.capture}`,"full-capture").replace('<img ','<img id="gameplay-image" data-gameplay-image ')}<figcaption data-gameplay-caption aria-live="polite">${escapeHtml(`${home.shapeNames[3]} — ${home.capture}`)}</figcaption></figure>
        <div class="capture-choices" role="group" aria-label="${escapeHtml(home.gallery)}">${shapes.map((shape,i)=>`<button type="button" class="capture-choice" aria-controls="gameplay-image" aria-pressed="${i===3}" data-gameplay-src="${gameplay.locales[locale.key][shape].src}" data-gameplay-alt="${escapeHtml(`${home.shapeNames[i]} — ${home.capture}`)}"><span aria-hidden="true">0${i+1}</span>${escapeHtml(home.shapeNames[i])}</button>`).join("")}</div>
      </div>
      <div class="challenge-copy"><p class="section-number">02 / ${escapeHtml(home.paceEyebrow)}</p><h2 id="pace-title">${escapeHtml(home.paceTitle)}</h2><p>${escapeHtml(home.paceBody)}</p><ul class="level-list">${home.levels.map(l=>`<li>${escapeHtml(l)}</li>`).join("")}</ul><a class="text-action" href="${pagePath(locale,"help")}">${escapeHtml(t.help)}${arrow}</a></div>
    </div>
    <div class="feature-grid">
      ${home.featureTitles.map((title,i)=>`<article class="feature"><span class="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${['<path d="M20 7v5h-5M4 17v-5h5M5.6 7a7 7 0 0 1 11.6-1L20 9M4 15l2.8 3A7 7 0 0 0 18.4 17"/>','<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>','<rect x="3" y="4" width="14" height="11" rx="2"/><path d="M7 20h6M10 15v5"/><rect x="16" y="11" width="5" height="10" rx="1"/>'][i]}</svg></span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(home.featureBodies[i])}</p></article>`).join("")}
    </div>
  </section>
  ${renderModes(locale)}
  ${renderFaq(locale, true)}
  <section class="closing"><div><h2>${escapeHtml(home.closing)}</h2><p>${escapeHtml(home.closingBody)}</p></div>${storeButton(locale)}</section>
</main>
${footer(locale, "home")}
</div></div>
<script src="${websiteJs}" defer></script>
</body>
</html>\n`;
}

function renderHelp(locale) {
  const t = ui[locale.key];
  const help = structuredClone(content.help[locale.key]);
  const copy = website[locale.key];
  help.ios[1] = copy.shapeHelp;
  help.mac[1] = copy.shapeHelp;
  for (const platform of ["ios","mac","tvos"]) help[platform].push(copy.circularHelp);
  help.tvos.push(copy.shapeHelp);
  const faq = [
    [help.iosTitle, help.ios],
    [help.macTitle, help.mac],
    [help.tvosTitle, help.tvos],
  ];
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale.htmlLang,
    mainEntity: [...faq.map(([name, items]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text: items.join(" ") },
    })), ...copy.faqs.map(([name, text]) => ({
      "@type": "Question", name,
      acceptedAnswer: { "@type": "Answer", text },
    }))],
  };
  const cards = faq.map(([title, items], index) => `<article class="help-card"><span class="card-index">0${index + 1}</span><h2>${escapeHtml(title)}</h2><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`).join("\n");
  return `${documentHead(locale, "help", copy.seoHelp, copy.helpLead, schema)}
<body><div class="page"><div class="container">
${header(locale, "help")}
<main>
  <header class="page-header"><p class="kicker">${escapeHtml(t.help)}</p><h1>${escapeHtml(help.title)}</h1><p class="lead">${escapeHtml(copy.helpLead)}</p></header>
  <section class="help-grid">${cards}</section>
  ${renderModes(locale)}
  ${renderFaq(locale)}
  <section class="download-panel"><div><h2>${escapeHtml(t.platforms)}</h2><p>${escapeHtml(t.platformsBody)}</p></div>${storeButton(locale, true)}</section>
</main>
${footer(locale, "help")}
</div></div></body>
</html>\n`;
}

function renderPrivacy(locale) {
  const t = ui[locale.key];
  const privacy = content.privacy[locale.key];
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t.seoPrivacy,
    description: t.privacyLead,
    inLanguage: locale.htmlLang,
    url: `${baseUrl}${pagePath(locale, "privacy")}`,
    dateModified: "2026-09-08",
    isPartOf: { "@type": "WebSite", name: "Infinity Maze", url: baseUrl },
  };
  const sections = privacy.sections.map(([heading, body]) => `<section class="policy-section"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`).join("\n");
  return `${documentHead(locale, "privacy", t.seoPrivacy, t.privacyLead, schema)}
<body><div class="page"><div class="container">
${header(locale, "privacy")}
<main>
  <header class="page-header"><p class="kicker">Infinity Maze 1.5</p><h1>${escapeHtml(privacy.title)}</h1><p class="lead">${escapeHtml(t.privacyLead)}</p><p class="effective-date">${escapeHtml(privacy.date)}</p></header>
  <div class="policy-grid">${sections}</div>
</main>
${footer(locale, "privacy")}
</div></div></body>
</html>\n`;
}

function renderSupport(locale) {
  const t = ui[locale.key];
  const schema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: t.seoSupport,
    description: t.supportLead,
    inLanguage: locale.htmlLang,
    url: `${baseUrl}${pagePath(locale, "support")}`,
    mainEntity: { "@type": "Organization", name: "Infinity Maze Support", email: supportEmail },
  };
  return `${documentHead(locale, "support", t.seoSupport, t.supportLead, schema)}
<body><div class="page"><div class="container">
${header(locale, "support")}
<main>
  <header class="page-header"><p class="kicker">${escapeHtml(t.support)}</p><h1>${escapeHtml(t.supportTitle)}</h1><p class="lead">${escapeHtml(t.supportLead)}</p></header>
  <section class="support-grid">
    <article class="support-card"><span class="feature-icon">@</span><h2>${escapeHtml(t.emailTitle)}</h2><p>${escapeHtml(t.emailBody)}</p><a class="text-link" href="mailto:${supportEmail}?subject=Infinity%20Maze%20Support">${supportEmail}</a></article>
    <article class="support-card"><span class="feature-icon">↗</span><h2>${escapeHtml(t.resourcesTitle)}</h2><div class="resource-links"><a href="${pagePath(locale, "help")}">${escapeHtml(t.help)}</a><a href="${pagePath(locale, "privacy")}">${escapeHtml(t.privacy)}</a>${storeButton(locale, true)}</div></article>
  </section>
</main>
${footer(locale, "support")}
</div></div></body>
</html>\n`;
}

for (const locale of locales) {
  const outputDir = locale.folder ? path.join(rootDir, locale.folder) : rootDir;
  fs.mkdirSync(outputDir, { recursive: true });
  for (const pageKey of ["home", "help", "support"]) {
    const html = {home: renderHome, help: renderHelp, support: renderSupport}[pageKey](locale);
    recordPage(locale, pageKey, html);
    fs.writeFileSync(path.join(outputDir, pages[pageKey].file), html);
  }
  // Privacy policy content and its legacy styles are explicitly out of scope.
  if (!fs.existsSync(path.join(outputDir, pages.privacy.file))) throw new Error("Existing privacy policy missing; refusing to generate a replacement.");
  recordPage(locale, "privacy", fs.readFileSync(path.join(outputDir, pages.privacy.file), "utf8"));
}
fs.writeFileSync(revisionsPath, `${JSON.stringify(revisions, null, 2)}\n`);

const sitemapUrls = [];
for (const pageKey of Object.keys(pages)) {
  for (const locale of locales) {
    sitemapUrls.push({
      url: `${baseUrl}${pagePath(locale, pageKey)}`,
      pageKey,
      lastModified: revisions[`${baseUrl}${pagePath(locale, pageKey)}`].lastModified,
    });
  }
}
function sitemapAlternates(pageKey) {
  const links = locales.map((locale) =>
    `    <xhtml:link rel="alternate" hreflang="${locale.hreflang}" href="${baseUrl}${pagePath(locale, pageKey)}" />`,
  );
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${pagePath(locales[0], pageKey)}" />`);
  return links.join("\n");
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapUrls.map((entry) => `  <url>\n    <loc>${entry.url}</loc>\n    <lastmod>${entry.lastModified}</lastmod>\n${sitemapAlternates(entry.pageKey)}\n  </url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(rootDir, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(rootDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);

const redirects = ["/google8bdd3bd447b6e703.html /google8bdd3bd447b6e703.txt 200"];
for (const pageKey of Object.keys(pages)) {
  for (const locale of locales) {
    redirects.push(`${legacyPagePath(locale, pageKey)} ${pagePath(locale, pageKey)} 301`);
  }
}
fs.writeFileSync(path.join(rootDir, "_redirects"), `${redirects.join("\n")}\n`);

const headers = `/*
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/style/*
  Cache-Control: public, max-age=86400

/favicon/*
  Cache-Control: public, max-age=604800

/images/*
  Cache-Control: public, max-age=604800
`;
fs.writeFileSync(path.join(rootDir, "_headers"), headers);

console.log(`Generated ${locales.length * Object.keys(pages).length} localized pages.`);
