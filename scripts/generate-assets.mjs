import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "data/site.json"), "utf8"));

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const teamColors = {
  ARG: ["#75aadb", "#ffffff", "#f6b40e"],
  BRA: ["#009b3a", "#ffdf00", "#002776"],
  MEX: ["#006847", "#ffffff", "#ce1126"],
  POL: ["#ffffff", "#dc143c", "#9ca3af"],
  SAU: ["#006c35", "#ffffff", "#0f5132"],
  USA: ["#3c3b6e", "#ffffff", "#b22234"],
  JPN: ["#ffffff", "#bc002d", "#d1d5db"],
  CRO: ["#f8fafc", "#d00000", "#171796"],
  SWE: ["#006aa7", "#fecc00", "#004b87"],
  POR: ["#006600", "#ff0000", "#ffcc00"],
  GHA: ["#ce1126", "#fcd116", "#006b3f"]
};

const flagCodes = {
  ALG: "dz",
  ARG: "ar",
  AUS: "au",
  AUT: "at",
  BEL: "be",
  BIH: "ba",
  BRA: "br",
  CAN: "ca",
  CIV: "ci",
  COD: "cd",
  COL: "co",
  CPV: "cv",
  CRO: "hr",
  CUW: "cw",
  CZE: "cz",
  ECU: "ec",
  EGY: "eg",
  ENG: "gb-eng",
  ESP: "es",
  FRA: "fr",
  GER: "de",
  GHA: "gh",
  HAI: "ht",
  IRN: "ir",
  IRQ: "iq",
  JOR: "jo",
  JPN: "jp",
  KOR: "kr",
  MAR: "ma",
  MEX: "mx",
  NED: "nl",
  NOR: "no",
  NZL: "nz",
  PAN: "pa",
  PAR: "py",
  POL: "pl",
  POR: "pt",
  QAT: "qa",
  RSA: "za",
  SAU: "sa",
  SCO: "gb-sct",
  SEN: "sn",
  SUI: "ch",
  SWE: "se",
  TUN: "tn",
  TUR: "tr",
  URU: "uy",
  USA: "us",
  UZB: "uz"
};

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function teamSvg({ code, name }) {
  const [primary, secondary, accent] = teamColors[code] || ["#003478", "#e8eefb", "#ff6b35"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-label="${esc(name)} team mark">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#001a43" flood-opacity=".22"/>
    </filter>
  </defs>
  <rect width="640" height="420" rx="28" fill="#f8fafc"/>
  <rect x="0" y="0" width="640" height="140" fill="${primary}"/>
  <rect x="0" y="140" width="640" height="140" fill="${secondary}"/>
  <rect x="0" y="280" width="640" height="140" fill="${accent}"/>
  <path d="M320 62l155 58v108c0 88-61 139-155 171-94-32-155-83-155-171V120l155-58z" fill="url(#g)" filter="url(#s)" opacity=".94"/>
  <path d="M320 88l126 47v91c0 68-46 109-126 138-80-29-126-70-126-138v-91l126-47z" fill="none" stroke="#fff" stroke-width="10" opacity=".9"/>
  <circle cx="320" cy="214" r="62" fill="#fff" opacity=".96"/>
  <text x="320" y="232" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="800" fill="#00204e">${esc(code)}</text>
  <text x="320" y="388" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" fill="#111c2d">${esc(name)}</text>
</svg>`;
}

function flagFallbackSvg({ code, name }) {
  const [primary, secondary, accent] = teamColors[code] || ["#003478", "#ffffff", "#ff6b35"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-label="${esc(name)} national flag fallback">
  <rect width="640" height="140" fill="${primary}"/>
  <rect y="140" width="640" height="140" fill="${secondary}"/>
  <rect y="280" width="640" height="140" fill="${accent}"/>
  <rect x="0" y="0" width="640" height="420" fill="none" stroke="#d8dee9" stroke-width="8"/>
  <circle cx="320" cy="210" r="88" fill="rgba(255,255,255,.92)"/>
  <text x="320" y="232" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="900" fill="#00204e">${esc(code)}</text>
</svg>`;
}

async function downloadFlag(team) {
  const flagCode = flagCodes[team.code];
  const outPath = path.join(root, `assets/flags/${slug(team.code)}.svg`);
  if (!flagCode) {
    await writeFile(outPath, flagFallbackSvg(team));
    return false;
  }

  try {
    const response = await fetch(`https://flagcdn.com/${flagCode}.svg`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const svg = await response.text();
    await writeFile(outPath, svg);
    return true;
  } catch {
    await writeFile(outPath, flagFallbackSvg(team));
    return false;
  }
}

function venueSvg(venue) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560" role="img" aria-label="${esc(venue.name)} venue image">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#003478"/>
      <stop offset=".55" stop-color="#395da2"/>
      <stop offset="1" stop-color="#ff6b35"/>
    </linearGradient>
    <radialGradient id="pitch" cx="50%" cy="52%" r="55%">
      <stop offset="0" stop-color="#20b15a"/>
      <stop offset="1" stop-color="#0b6b3a"/>
    </radialGradient>
  </defs>
  <rect width="960" height="560" fill="url(#sky)"/>
  <circle cx="775" cy="95" r="58" fill="#d4af37" opacity=".88"/>
  <path d="M90 332c110-92 250-138 420-138s310 46 420 138v72H90z" fill="#0f1b2d" opacity=".88"/>
  <path d="M144 345c92-62 214-96 366-96s274 34 366 96" fill="none" stroke="#e8eefb" stroke-width="22" opacity=".75"/>
  <ellipse cx="510" cy="395" rx="330" ry="96" fill="url(#pitch)"/>
  <ellipse cx="510" cy="395" rx="182" ry="52" fill="none" stroke="#ffffff" stroke-width="5" opacity=".82"/>
  <line x1="510" y1="299" x2="510" y2="491" stroke="#ffffff" stroke-width="5" opacity=".72"/>
  <rect x="48" y="42" width="430" height="126" rx="10" fill="rgba(255,255,255,.88)"/>
  <text x="76" y="94" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800" fill="#00204e">${esc(venue.name)}</text>
  <text x="76" y="132" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#434751">${esc(venue.city)}, ${esc(venue.country)} · ${esc(venue.capacity)}</text>
</svg>`;
}

function newsSvg(item) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="360" viewBox="0 0 560 360" role="img" aria-label="${esc(item.tag)} news image">
  <rect width="560" height="360" rx="24" fill="#e8eefb"/>
  <rect x="32" y="32" width="496" height="296" rx="18" fill="#ffffff"/>
  <rect x="32" y="32" width="496" height="84" rx="18" fill="#003478"/>
  <circle cx="90" cy="74" r="24" fill="#ff6b35"/>
  <text x="132" y="84" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="#ffffff">${esc(item.tag)}</text>
  <text x="62" y="174" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" fill="#00204e">${esc(item.source)}</text>
  <path d="M62 218h388M62 252h336M62 286h260" stroke="#cfd6e4" stroke-width="16" stroke-linecap="round"/>
</svg>`;
}

function brandSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="CupCalendar World Cup icon">
  <defs>
    <linearGradient id="cup" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff4b8"/>
      <stop offset=".48" stop-color="#d4af37"/>
      <stop offset="1" stop-color="#9b6b16"/>
    </linearGradient>
    <linearGradient id="field" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#00885a"/>
      <stop offset="1" stop-color="#003478"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="#00204e"/>
  <circle cx="256" cy="256" r="190" fill="url(#field)"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#ffffff" stroke-width="14" opacity=".9"/>
  <path d="M171 124h170v42c0 58-32 102-85 119-53-17-85-61-85-119z" fill="url(#cup)"/>
  <path d="M166 150h-44c4 58 36 91 80 100" fill="none" stroke="#d4af37" stroke-width="26" stroke-linecap="round"/>
  <path d="M346 150h44c-4 58-36 91-80 100" fill="none" stroke="#d4af37" stroke-width="26" stroke-linecap="round"/>
  <path d="M221 286h70v54h-70z" fill="url(#cup)"/>
  <path d="M188 344h136l20 48H168z" fill="url(#cup)"/>
  <circle cx="256" cy="199" r="42" fill="#ffffff" opacity=".95"/>
  <path d="M256 158v82M215 199h82M228 170l56 58M284 170l-56 58" stroke="#00204e" stroke-width="8" stroke-linecap="round" opacity=".86"/>
  <text x="256" y="445" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="900" fill="#ffffff">2026</text>
</svg>`;
}

function siteManifest() {
  return `${JSON.stringify({
    name: "CupCalendar 2026",
    short_name: "CupCalendar",
    description: "2026 FIFA World Cup schedule, teams, venues, standings, and calendar tools.",
    start_url: "/2026/",
    scope: "/",
    display: "standalone",
    background_color: "#00204e",
    theme_color: "#003478",
    icons: [
      {
        src: "/assets/brand/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  }, null, 2)}\n`;
}

const teamMap = new Map();
for (const team of data.teams) teamMap.set(team.code, { code: team.code, name: team.name });
for (const match of data.matches) {
  teamMap.set(match.homeCode, { code: match.homeCode, name: match.home });
  teamMap.set(match.awayCode, { code: match.awayCode, name: match.away });
}

await mkdir(path.join(root, "assets/teams"), { recursive: true });
await mkdir(path.join(root, "assets/flags"), { recursive: true });
await mkdir(path.join(root, "assets/venues"), { recursive: true });
await mkdir(path.join(root, "assets/news"), { recursive: true });
await mkdir(path.join(root, "assets/brand"), { recursive: true });

for (const team of teamMap.values()) {
  await writeFile(path.join(root, `assets/teams/${slug(team.code)}.svg`), teamSvg(team));
}

let downloadedFlags = 0;
for (const team of teamMap.values()) {
  if (await downloadFlag(team)) downloadedFlags += 1;
}

for (const venue of data.venues) {
  await writeFile(path.join(root, `assets/venues/${venue.slug}.svg`), venueSvg(venue));
}

for (const item of data.news) {
  await writeFile(path.join(root, `assets/news/${slug(item.source)}-${slug(item.tag)}.svg`), newsSvg(item));
}

const icon = brandSvg();
await writeFile(path.join(root, "assets/brand/icon.svg"), icon);
await writeFile(path.join(root, "assets/brand/favicon.svg"), icon);
await writeFile(path.join(root, "assets/site.webmanifest"), siteManifest());

console.log(`Generated ${teamMap.size} team images, ${downloadedFlags}/${teamMap.size} downloaded flags, ${data.venues.length} venue images, ${data.news.length} news images, favicon, manifest, and brand assets.`);
