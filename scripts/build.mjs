import { cp, mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const data = JSON.parse(await readFile(path.join(root, "data/site.json"), "utf8"));

const pageList = [];

// 简易本地化词典，用于翻译导航和核心 SEO 词汇
const i18n = {
  en: { schedule: "Schedule", teams: "Teams", venues: "Venues", history: "History", tools: "Tools", news: "News", langBtn: "Lang", homeTitle: "2026 FIFA World Cup Schedule, Teams & Calendar", desc: "CupCalendar is a 2026 FIFA World Cup schedule, standings, teams, venues, history, and calendar subscription portal." },
  zh: { schedule: "赛程表", teams: "球队档案", venues: "场馆指南", history: "历史数据", tools: "球迷工具", news: "实时资讯", langBtn: "语言", homeTitle: "2026美加墨世界杯赛程表、积分榜及全日程日历订阅 | CupCalendar", desc: "CupCalendar 2026世界杯专题站：提供最新美加墨世界杯全赛程时间表、时区转换、积分榜及各国家队阵容名单。" },
  es: { schedule: "Calendario", teams: "Equipos", venues: "Sedes", history: "Historia", tools: "Herramientas", news: "Noticias", langBtn: "Idioma", homeTitle: "Calendario Copa Mundial 2026, Clasificaciones y Equipos | CupCalendar", desc: "CupCalendar es un portal con el calendario de la Copa Mundial de la FIFA 2026, posiciones, sedes y herramientas fan." },
  pt: { schedule: "Calendário", teams: "Equipes", venues: "Sedes", history: "História", tools: "Ferramentas", news: "Notícias", langBtn: "Idioma", homeTitle: "Calendário da Copa do Mundo de 2026 e Classificação", desc: "Acompanhe o calendário completo da Copa do Mundo FIFA 2026, seleções, estádios e tabelas." },
  fr: { schedule: "Calendrier", teams: "Équipes", venues: "Stades", history: "Histoire", tools: "Outils", news: "Actualités", langBtn: "Langue", homeTitle: "Calendrier de la Coupe du Monde 2026 et Classements", desc: "Découvrez le calendrier officiel de la Coupe du Monde de la FIFA 2026, profils des équipes et stades." },
  de: { schedule: "Spielplan", teams: "Teams", venues: "Stadien", history: "Historie", tools: "Tools", news: "News", langBtn: "Sprache", homeTitle: "WM Spielplan 2026, Tabellen & Termine | CupCalendar", desc: "Der unabhängige WM 2026 Spielplan, Tabellen, Austragungsorte und Kalender-Feed für Fans." },
  ja: { schedule: "日程・結果", teams: "出場国", venues: "スタジアム", history: "歴史", tools: "ツール", news: "ニュース", langBtn: "言語", homeTitle: "2026 FIFAワールドカップ 日程表・順位表・出場国一覧", desc: "2026年W杯美加墨大会の全試合日程、キックオフ時間、グループリーグ順位表、スタジアムガイド。" }
};

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const slugifyDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en", {
  month: "short",
  day: "numeric"
});

const groupMatches = (matches) =>
  matches.reduce((acc, match) => {
    acc[match.date] = acc[match.date] || [];
    acc[match.date].push(match);
    return acc;
  }, {});

const isoStart = (match) => `${match.date}T${match.time}:00-05:00`;

function asset(src) {
  return `/assets/${src}`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function teamImage(code) {
  return asset(`teams/${slug(code)}.svg`);
}

function venueImage(venue) {
  return asset(`venues/${venue.slug}.svg`);
}

function newsImage(item) {
  return asset(`news/${slug(item.source)}-${slug(item.tag)}.svg`);
}

function pageUrl(route) {
  return `${data.domain}${route}`;
}

function writeRoute(route, html, priority = "0.7") {
  pageList.push({ route, priority });
  const outPath = route.endsWith("/")
    ? path.join(dist, route, "index.html")
    : path.join(dist, route);
  return mkdir(path.dirname(outPath), { recursive: true }).then(() => writeFile(outPath, html));
}

function baseJsonLd(route, extra = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: extra.name || data.tournament,
    url: pageUrl(route),
    isPartOf: {
      "@type": "WebSite",
      name: data.siteName,
      url: data.domain
    },
    about: {
      "@type": "SportsEvent",
      name: data.tournament,
      startDate: data.openingDate,
      sport: "Soccer"
    },
    ...extra
  };
}

function layout({ route, lang = "en", title, description, active, h1, intro, body, jsonLd, extraHead = "" }) {
  const canonical = pageUrl(route);
  const current = (href) => (href === route || (href !== `/2026/${lang}/` && route.startsWith(href)) ? ' aria-current="page"' : "");

  const languageLinks = data.languages
    .map((l) => `<link rel="alternate" hreflang="${l.code}" href="${data.domain}/2026/${l.code}/">`)
    .join("\n");

  const dict = i18n[lang] || i18n.en;

  // 将通用的英文 Nav 转换为对应的本地化文本
  const localizedNav = [
    { label: dict.schedule, href: `/2026/${lang}/schedule/` },
    { label: dict.teams, href: `/2026/${lang}/teams/` },
    { label: dict.venues, href: `/2026/${lang}/venues/` },
    { label: dict.history, href: `/2026/${lang}/history/` },
    { label: dict.tools, href: `/2026/${lang}/tools/` },
    { label: dict.news, href: `/2026/${lang}/news/` }
  ];

  return `<!doctype html>
<html lang="${lang}" data-kickoff="${esc(data.openingDate)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  ${languageLinks}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${asset("styles.css")}">

  ${data.monetization?.googleAnalyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(data.monetization.googleAnalyticsId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${esc(data.monetization.googleAnalyticsId)}');
  </script>` : ""}

  ${data.monetization?.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(data.monetization.adsenseClient)}" crossorigin="anonymous"></script>` : ""}

  <script type="application/ld+json">${JSON.stringify(jsonLd || baseJsonLd(route))}</script>
  ${extraHead}
</head>
<body>
  <header class="topbar">
    <div class="nav-shell">
      <a class="brand" href="/2026/${lang}/" aria-label="CupCalendar 2026 home">
        <span class="brand-mark"><img src="${asset("brand/icon.svg")}" alt="" loading="lazy"></span>
        <span>CupCalendar 2026</span>
      </a>
      <nav class="desktop-nav" aria-label="Primary">
        ${localizedNav.map((item) => `<a href="${item.href}"${current(item.href)}>${item.label}</a>`).join("")}
      </nav>
      <div class="nav-actions">
        <label class="search">
          <span aria-hidden="true">Search</span>
          <input type="search" placeholder="Search...">
        </label>
        <button class="icon-btn" aria-label="Change language" title="Language">${dict.langBtn}</button>
        <button class="icon-btn" data-menu-button aria-expanded="false" aria-label="Open menu">Menu</button>
      </div>
    </div>
    <nav class="mobile-menu" aria-label="Mobile">
      ${localizedNav.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
    </nav>
  </header>
  <main>
    ${h1 ? `<section class="container section page-title"><div><h1>${esc(h1)}</h1>${intro ? `<p>${esc(intro)}</p>` : ""}</div></section>` : ""}
    ${body}
  </main>
  <nav class="bottom-tabs" aria-label="Quick navigation">
    <a href="/2026/${lang}/schedule/">${dict.schedule}</a>
    <a href="/2026/${lang}/schedule/#standings">Standings</a>
    <a href="/2026/${lang}/teams/">${dict.teams}</a>
  </nav>
  <footer class="footer">
    <div class="container footer-grid">
      <div>
        <h2>CupCalendar 2026</h2>
        <p>Independent 2026 FIFA World Cup calendar, schedule, teams, venues, and fan tools. CupCalendar is not affiliated with FIFA.</p>
      </div>
      <div>
        <h3>Popular Links</h3>
        <a href="/2026/${lang}/schedule/">2026 World Cup Schedule</a>
        <a href="/2026/${lang}/teams/">2026 FIFA World Cup Teams</a>
        <a href="/2026/${lang}/tools/">Calendar Subscription</a>
      </div>
      <div>
        <h3>Legal</h3>
        <a href="/2026/${lang}/privacy/">Privacy Policy</a>
        <a href="/2026/${lang}/terms/">Terms of Service</a>
      </div>
    </div>
  </footer>
  <script src="${asset("app.js")}" defer></script>
</body>
</html>`;
}

function renderAdSlot(format = "square") {
  if (format === "banner") {
    return `<div class="ad-slot banner" aria-label="Advertisement"><span>Advertisement</span></div>`;
  }
  return `<div class="ad-slot" aria-label="Advertisement"><span>Advertisement</span></div>`;
}

function matchCard(match, lang) {
  const statusClass = match.status.toLowerCase().includes("live") || match.status.toLowerCase().includes("upcoming") ? "" : " muted";
  return `<article class="match-card" data-match-start="${isoStart(match)}" data-match-label="${esc(match.home)} vs ${esc(match.away)}" data-match-id="${esc(match.id)}" data-match-venue="${esc(match.venue)}">
    <div class="match-meta">
      <strong>${esc(match.venue)}, ${esc(match.city)}</strong>
      <span class="match-time">${esc(match.time)}</span>
      <span>${esc(match.group)} · ${esc(match.matchday)}</span>
    </div>
    <div class="scoreline">
      <div><span class="team-badge"><img src="${teamImage(match.homeCode)}" alt="${esc(match.home)} team image" loading="lazy"></span><strong>${esc(match.home)}</strong></div>
      <div><div class="score">${esc(match.score)}</div><div class="prediction">Projected: ${esc(match.prediction)}</div></div>
      <div><span class="team-badge"><img src="${teamImage(match.awayCode)}" alt="${esc(match.away)} team image" loading="lazy"></span><strong>${esc(match.away)}</strong></div>
    </div>
    <div class="match-actions">
      <span class="status${statusClass}">${esc(match.status)}</span>
      <a class="btn secondary" href="/2026/${lang}/matches/${esc(match.id)}/">Match Center</a>
      <a class="btn primary" href="${esc(match.ticketUrl)}" rel="nofollow sponsored">Tickets</a>
    </div>
  </article>`;
}

function standingsTable(group) {
  return `<section class="panel" id="standings">
    <h2>${esc(group.group)} Standings</h2>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Rank</th><th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num">GD</th><th class="num">Pts</th></tr></thead>
        <tbody>
          ${group.rows.map((row, index) => `<tr class="${index < 2 ? "qualifier" : index === 2 ? "bubble" : ""}">
            <td>${index + 1}</td><td>${esc(row.team)}</td><td class="num">${row.played}</td><td class="num">${row.won}</td><td class="num">${row.drawn}</td><td class="num">${row.lost}</td><td class="num">${row.gd}</td><td class="num"><strong>${row.points}</strong></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </section>`;
}

function homePage(lang) {
  const dict = i18n[lang] || i18n.en;
  return `<section class="container">
    <div class="hero">
      <div class="hero-copy">
        <span class="eyebrow">2026-first SEO hub · cupcalendar.xyz/2026/${lang}/</span>
        <h1>${esc(dict.homeTitle)}</h1>
        <p>Follow every match across the United States, Canada, and Mexico with local kick-off times, standings, team profiles, and one-click calendar tools.</p>
        <div class="countdown" data-countdown aria-label="Countdown to kickoff">
          <div><strong data-unit="days">0</strong><span>Days</span></div>
          <div><strong data-unit="hours">00</strong><span>Hours</span></div>
          <div><strong data-unit="minutes">00</strong><span>Minutes</span></div>
          <div><strong data-unit="seconds">00</strong><span>Seconds</span></div>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="/2026/${lang}/schedule/">View 2026 Schedule</a>
          <a class="btn ghost" href="/2026/${lang}/tools/">Get Calendar Feed</a>
        </div>
      </div>
      <div class="hero-media"><img src="${asset("hero-stadium.png")}" alt="Modern soccer stadium" loading="eager"></div>
    </div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>Today & Tomorrow Focus</h2><p>Fast match cards for local time, venue, teams, status, and ticket links in one scan.</p></div><a class="btn secondary" href="/2026/${lang}/schedule/">Full Schedule</a></div>
    ${data.matches.slice(0, 3).map(m => matchCard(m, lang)).join("")}
  </section>
  <section class="container section">
    <div class="layout">
      <div class="grid two">
        ${standingsTable(data.standings[0])}
        <section class="panel">
          <h2>Latest 2026 World Cup News</h2>
          <div class="news-list">${data.news.map((item) => `<article class="news-item"><div class="news-thumb"><img src="${newsImage(item)}" alt="${esc(item.source)} ${esc(item.tag)} image" loading="lazy"></div><div><span class="chip">${esc(item.source)}</span><h3>${esc(item.title)}</h3><p class="muted">${esc(item.time)}</p></div></article>`).join("")}</div>
        </section>
      </div>
      <aside class="side-stack">
        ${renderAdSlot("square")}
        <section class="panel"><h2>SEO Recovery Plan</h2><p>All priority pages live under <strong>/2026/</strong></p></section>
      </aside>
    </div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>2026 FIFA World Cup Teams</h2><p>Searchable team cards with rankings, confederations, squad links, and fixture paths.</p></div><a class="btn secondary" href="/2026/${lang}/teams/">All Teams</a></div>
    <div class="grid four">${data.teams.map(t => teamCard(t, lang)).join("")}</div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>Venue Guide</h2><p>Host-city entry points for stadium facts, match lists, capacity, and travel planning.</p></div><a class="btn secondary" href="/2026/${lang}/venues/">All Venues</a></div>
    <div class="grid four">${data.venues.map(v => venueCard(v, lang)).join("")}</div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>World Cup History Snapshot</h2><p>Recent champions and all-time scorers add evergreen context to the 2026 hub.</p></div><a class="btn secondary" href="/2026/${lang}/history/">History Data</a></div>
    <div class="grid two">
      <section class="panel"><h3>Recent Champions</h3>${championsTable()}</section>
      <section class="panel"><h3>All-Time Scorers Top 5</h3>${scorersTable()}</section>
    </div>
  </section>`;
}

function teamCard(team, lang) {
  return `<article class="team-card" data-team-card="${esc(`${team.name} ${team.code} ${team.region}`)}">
    <a href="/2026/${lang}/teams/${esc(team.slug)}/">
      <div class="flag-tile"><img src="${teamImage(team.code)}" alt="${esc(team.name)} team image" loading="lazy"></div>
      <div class="card-title"><span>${esc(team.name)}</span><span class="chip">#${team.ranking}</span></div>
      <p class="muted">${esc(team.region)} · ${team.titles} titles</p>
    </a>
  </article>`;
}

function venueCard(venue, lang) {
  return `<article class="venue-card">
    <a href="/2026/${lang}/venues/${esc(venue.slug)}/">
      <div class="venue-media"><img src="${venueImage(venue)}" alt="${esc(venue.name)} venue image" loading="lazy"></div>
      <div class="card-title"><span>${esc(venue.name)}</span><span>${venue.matches}</span></div>
      <p class="muted">${esc(venue.city)}, ${esc(venue.country)} · ${esc(venue.capacity)} seats</p>
    </a>
  </article>`;
}

function championsTable() {
  return `<div class="table-scroll"><table><thead><tr><th>Year</th><th>Winner</th><th>Runner-up</th><th>Final</th></tr></thead><tbody>${data.champions.map((row) => `<tr><td>${row.year}</td><td>${esc(row.winner)}</td><td>${esc(row.runnerUp)}</td><td>${esc(row.score)}</td></tr>`).join("")}</tbody></table></div>`;
}

function scorersTable() {
  return `<div class="table-scroll"><table><thead><tr><th>Rank</th><th>Player</th><th>Country</th><th class="num">Goals</th></tr></thead><tbody>${data.scorers.map((row) => `<tr><td>${row.rank}</td><td>${esc(row.player)}</td><td>${esc(row.country)}</td><td class="num"><strong>${row.goals}</strong></td></tr>`).join("")}</tbody></table></div>`;
}

function schedulePage(lang) {
  const grouped = groupMatches(data.matches);
  const dates = Object.keys(grouped).sort();
  return `<section class="container section">
    <div class="layout">
      <div>
        <div class="tabs" role="tablist">
          <button class="tab is-active" type="button">Schedule</button>
          <a class="tab" href="#standings">Standings</a>
          <a class="tab" href="#bracket">Knockout Bracket</a>
        </div>
        <section class="card filter-card">
          <div class="filter-row">
            <div class="toolbar">
              <select aria-label="Group filter"><option>All groups</option><option>Group A</option><option>Group B</option></select>
              <select aria-label="Team filter"><option>All teams</option>${data.teams.map((team) => `<option>${esc(team.name)}</option>`).join("")}</select>
              <select aria-label="Stage filter"><option>All stages</option><option>Group stage</option><option>Round of 32</option></select>
            </div>
            <a class="btn secondary" href="/2026/${lang}/tools/">Subscribe</a>
          </div>
          <div class="date-strip">${dates.map((date, index) => `<a class="date-pill ${index === 1 ? "active" : ""}" href="#date-${date}"><span>${slugifyDate(date)}</span><strong>View</strong></a>`).join("")}</div>
        </section>
        ${dates.map((date) => `<section class="section" id="date-${date}"><h2>${esc(slugifyDate(date))} · 2026 FIFA World Cup Matches</h2>${grouped[date].map(m => matchCard(m, lang)).join("")}</section>`).join("")}
        <section class="section" id="standings"><div class="grid two">${data.standings.map(standingsTable).join("")}</div></section>
        <section class="section" id="bracket"><div class="panel"><h2>2026 FIFA World Cup Knockout Bracket</h2><p class="muted">Knockout paths will be populated from group-stage results when qualified teams are known.</p><div class="grid four">${["Round of 32", "Round of 16", "Quarter-finals", "Final"].map((label) => `<div class="card"><strong>${label}</strong><p class="muted">Qualification slots pending</p></div>`).join("")}</div></div></section>
      </div>
      <aside class="side-stack">
        ${renderAdSlot("square")}
        ${standingsTable(data.standings[0])}
      </aside>
    </div>
  </section>`;
}

function teamsPage(lang) {
  return `<section class="container section">
    <div class="toolbar">
      <input data-team-search type="search" placeholder="Search teams by country, code, or confederation" aria-label="Search teams">
      <a class="btn secondary" href="/2026/${lang}/schedule/">View Team Fixtures</a>
    </div>
    <div class="grid four section">${data.teams.map(t => teamCard(t, lang)).join("")}</div>
  </section>`;
}

function teamPage(team, lang) {
  const teamMatches = data.matches.filter((match) => match.home === team.name || match.away === team.name);
  return `<section class="container section">
    <header class="panel profile-header">
      <div class="profile-main">
        <div class="flag-tile"><img src="${teamImage(team.code)}" alt="${esc(team.name)} team image" loading="lazy"></div>
        <div>
          <h1>2026 FIFA World Cup ${esc(team.name)} Team Profile</h1>
          <div class="language-row">
            <span class="chip">FIFA ranking: ${team.ranking}</span>
            <span class="chip">${esc(team.region)}</span>
            <span class="chip gold">${team.titles} titles</span>
          </div>
        </div>
      </div>
      <button class="btn secondary" type="button">Follow Team</button>
    </header>
    <div class="layout section">
      <div class="grid">
        <div class="grid two">
          <section class="panel"><h2>Basic Information</h2><table><tbody><tr><td>Coach</td><td><strong>${esc(team.coach)}</strong></td></tr><tr><td>Captain</td><td><strong>${esc(team.captain)}</strong></td></tr><tr><td>Market value</td><td><strong>${esc(team.marketValue)}</strong></td></tr><tr><td>Average age</td><td><strong>${esc(team.averageAge)}</strong></td></tr></tbody></table></section>
          <section class="panel"><h2>Recent Form</h2><div class="form-line">${team.form.map((result) => `<span class="${result.toLowerCase()}">${esc(result)}</span>`).join("")}</div><p class="muted">Last 10 international matches.</p></section>
        </div>
        <section class="panel"><h2>2026 FIFA World Cup Squad</h2><div class="table-scroll"><table><thead><tr><th>No.</th><th>Player</th><th>Position</th><th>Club</th><th class="num">Age</th></tr></thead><tbody>${team.players.map((player) => `<tr><td>${player.no}</td><td><strong>${esc(player.name)}</strong></td><td>${esc(player.position)}</td><td>${esc(player.club)}</td><td class="num">${player.age}</td></tr>`).join("")}</tbody></table></div></section>
        <section class="panel"><h2>World Cup History</h2><div class="timeline">${team.history.map((row) => `<div class="timeline-item"><h3>${row.year} · ${esc(row.result)}</h3><p>${esc(row.note)}</p></div>`).join("")}</div></section>
      </div>
      <aside class="side-stack">
        <section class="panel"><h2>${esc(team.name)} 2026 Fixtures</h2>${teamMatches.length ? teamMatches.map(m => matchCard(m, lang)).join("") : "<p class=\"muted\">No listed fixtures in the current schedule snapshot.</p>"}</section>
        ${renderAdSlot("square")}
      </aside>
    </div>
  </section>`;
}

function venuesPage(lang) {
  return `<section class="container section"><div class="grid four">${data.venues.map(v => venueCard(v, lang)).join("")}</div></section>`;
}

function venuePage(venue, lang) {
  const matches = data.matches.filter((match) => match.venue === venue.name);
  return `<section class="container section">
    <div class="layout">
      <article class="panel">
        <div class="venue-media large"><img src="${venueImage(venue)}" alt="${esc(venue.name)} venue image" loading="lazy"></div>
        <h2>${esc(venue.name)} 2026 World Cup Guide</h2>
        <p>${esc(venue.name)} in ${esc(venue.city)} is part of the 2026 FIFA World Cup host network. This guide combines stadium facts, match schedule links, transport context, and city planning notes.</p>
        <div class="grid three">
          <div class="card"><strong>City</strong><p>${esc(venue.city)}, ${esc(venue.country)}</p></div>
          <div class="card"><strong>Capacity</strong><p>${esc(venue.capacity)}</p></div>
          <div class="card"><strong>Planned matches</strong><p>${venue.matches}</p></div>
        </div>
        <h2>Matches at ${esc(venue.name)}</h2>
        ${matches.length ? matches.map(m => matchCard(m, lang)).join("") : "<p class=\"muted\">No assigned matches in the current schedule snapshot.</p>"}
      </article>
      <aside class="side-stack">${renderAdSlot("square")}<section class="panel"><h2>Travel Notes</h2><p class="muted">Use this area for airport access, transit choices, nearby districts, and matchday accommodation guidance.</p></section></aside>
    </div>
  </section>`;
}

function toolsPage(lang) {
  return `<section class="container section">
    <div class="tools-grid">
      <section class="tool-panel">
        <h2>2026 World Cup Calendar Subscription</h2>
        <p class="muted">Download an ICS file for the current 2026 FIFA World Cup fixture snapshot and import it into Google, Outlook, or Apple Calendar.</p>
        ${data.matches.map((match) => `<span class="sr-only" data-match-start="${isoStart(match)}" data-match-label="${esc(match.home)} vs ${esc(match.away)}" data-match-id="${esc(match.id)}" data-match-venue="${esc(match.venue)}"></span>`).join("")}
        <button class="btn primary" type="button" data-ics>Download ICS</button>
      </section>
      <section class="tool-panel">
        <h2>Timezone Converter</h2>
        <form>
          <label>Display match times in
            <select data-timezone>
              <option value="America/New_York">New York</option>
              <option value="America/Los_Angeles">Los Angeles</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Shanghai">Shanghai</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </label>
        </form>
        <ul data-timezone-output></ul>
      </section>
    </div>
    ${renderAdSlot("banner")}
  </section>`;
}

function historyPage(lang) {
  return `<section class="container section"><div class="grid two"><section class="panel"><h2>Previous World Cup Champions</h2>${championsTable()}</section><section class="panel"><h2>All-Time Scorers</h2>${scorersTable()}</section></div></section>`;
}

function newsPage(lang) {
  return `<section class="container section"><div class="layout"><div class="news-list">${data.news.map((item) => `<article class="news-item"><div class="news-thumb"><img src="${newsImage(item)}" alt="${esc(item.source)} ${esc(item.tag)} image" loading="lazy"></div><div><span class="chip">${esc(item.source)}</span><h2>${esc(item.title)}</h2><p class="muted">${esc(item.time)} · Aggregated source card</p></div></article>`).join("")}</div><aside class="side-stack">${renderAdSlot("square")}<section class="panel"><h2>Refresh Plan</h2><p class="muted">The content pipeline is structured for RSS refreshes during active tournament windows.</p></section></aside></div></section>`;
}

function matchDetailPage(match, lang) {
  return `<section class="container section">
    <div class="panel">
      <div class="language-row"><span class="chip">${esc(match.group)}</span><span class="chip">${esc(match.matchday)}</span><span class="status">${esc(match.status)}</span></div>
      <div class="scoreline" style="margin:40px auto;max-width:720px">
        <div><span class="team-badge"><img src="${teamImage(match.homeCode)}" alt="${esc(match.home)} team image" loading="lazy"></span><h2>${esc(match.home)}</h2></div>
        <div><div class="score">${esc(match.score)}</div></div>
        <div><span class="team-badge"><img src="${teamImage(match.awayCode)}" alt="${esc(match.away)} team image" loading="lazy"></span><h2>${esc(match.away)}</h2></div>
      </div>
    </div>
    <div class="grid two section">
      <section class="panel"><h2>Match Information</h2><table><tbody><tr><td>Kick-off</td><td>${esc(match.date)} ${esc(match.time)} local</td></tr><tr><td>Venue</td><td>${esc(match.venue)}</td></tr><tr><td>City</td><td>${esc(match.city)}</td></tr><tr><td>Model line</td><td>${esc(match.prediction)}</td></tr></tbody></table></section>
      <section class="panel"><h2>Match Stats</h2><div class="stats-list">${["Possession", "Shots", "Shots on target", "Corners"].map((label, index) => `<div><div class="stat-row"><strong>${42 + index}</strong><span>${label}</span><strong>${58 - index}</strong></div><div class="track"><span style="width:${42 + index * 6}%"></span></div></div>`).join("")}</div></section>
      <section class="panel"><h2>Match Timeline</h2><div class="timeline"><div class="timeline-item"><h3>Kick-off Window</h3><p>Confirmed events will populate from the match data feed.</p></div><div class="timeline-item"><h3>Status</h3><p>${esc(match.status)} · ${esc(match.venue)}, ${esc(match.city)}</p></div></div></section>
      <section class="panel"><h2>Prediction Poll</h2><div class="toolbar"><button class="btn secondary">${esc(match.home)} win</button><button class="btn secondary">Draw</button><button class="btn secondary">${esc(match.away)} win</button></div></section>
    </div>
  </section>`;
}

function simplePolicy(route, lang, title, h1) {
  const isPrivacy = title.toLowerCase().includes("privacy");
  const copy = isPrivacy
    ? `<p>CupCalendar uses privacy-conscious analytics to understand aggregate traffic patterns and improve 2026 FIFA World Cup schedule pages. If advertising or affiliate links are enabled, third-party providers may use cookies or similar technologies according to their own policies.</p><p>We do not sell personal information, and the static site does not require account creation for schedule, team, venue, or calendar tools.</p>`
    : `<p>CupCalendar is an independent fan information portal for 2026 FIFA World Cup schedules, teams, venues, history, and calendar tools. It is not affiliated with FIFA, the tournament organizers, teams, venues, or ticketing partners.</p><p>Fixture data, team information, and venue details are provided for general informational use and should be checked against official sources before travel or ticket purchases.</p>`;
  return layout({
    route,
    lang,
    title,
    description: `${title} for CupCalendar 2026.`,
    h1,
    body: `<section class="container section"><article class="panel">${copy}</article></section>`
  });
}

function sitemap() {
  const urls = pageList
    .filter((page) => page.route.includes("/2026/") && !page.route.endsWith("sitemap.xml"))
    .map((page) => `  <url><loc>${pageUrl(page.route)}</loc><changefreq>daily</changefreq><priority>${page.priority}</priority></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// 主构建流程执行
async function build() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
  await copyFile(path.join(root, "CNAME"), path.join(dist, "CNAME"));

  await copyFile(path.join(root, "ads.txt"), path.join(dist, "ads.txt"));

  await writeRoute("/", `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>2026 FIFA World Cup | CupCalendar</title><meta http-equiv="refresh" content="0; url=/2026/"><link rel="canonical" href="${data.domain}/2026/"></head><body><a href="/2026/">Continue to 2026 FIFA World Cup CupCalendar</a></body></html>`, "0.5");

  await writeRoute("/2026/", layout({
    route: "/2026/",
    lang: "en",
    title: "2026 FIFA World Cup Schedule, Teams & Calendar | CupCalendar",
    description: i18n.en.desc,
    body: homePage("en"),
    jsonLd: baseJsonLd("/2026/", { name: "2026 FIFA World Cup Schedule, Teams & Calendar | CupCalendar" })
  }), "1.0");

  // 循环为 site.json 中配置的所有 7 种语言独立编译全套子专区页面结构
  for (const langObj of data.languages) {
    const lang = langObj.code;
    const dict = i18n[lang] || i18n.en;

    await writeRoute(`/2026/${lang}/`, layout({ route: `/2026/${lang}/`, lang, title: `${dict.homeTitle} | CupCalendar`, description: dict.desc, body: homePage(lang) }), "0.95");
    await writeRoute(`/2026/${lang}/schedule/`, layout({ route: `/2026/${lang}/schedule/`, lang, title: `2026 FIFA World Cup ${dict.schedule} | CupCalendar`, description: dict.desc, h1: `2026 FIFA World Cup ${dict.schedule}`, body: schedulePage(lang) }), "0.95");
    await writeRoute(`/2026/${lang}/teams/`, layout({ route: `/2026/${lang}/teams/`, lang, title: `2026 FIFA World Cup ${dict.teams} | CupCalendar`, description: dict.desc, h1: `2026 FIFA World Cup ${dict.teams}`, body: teamsPage(lang) }), "0.9");

    for (const team of data.teams) {
      await writeRoute(`/2026/${lang}/teams/${team.slug}/`, layout({ route: `/2026/${lang}/teams/${team.slug}/`, lang, title: `2026 FIFA World Cup ${team.name} Team Profile | CupCalendar`, description: dict.desc, body: teamPage(team, lang) }), "0.82");
    }

    await writeRoute(`/2026/${lang}/venues/`, layout({ route: `/2026/${lang}/venues/`, lang, title: `2026 FIFA World Cup ${dict.venues} | CupCalendar`, description: dict.desc, h1: `2026 FIFA World Cup ${dict.venues}`, body: venuesPage(lang) }), "0.82");
    for (const venue of data.venues) {
      await writeRoute(`/2026/${lang}/venues/${venue.slug}/`, layout({ route: `/2026/${lang}/venues/${venue.slug}/`, lang, title: `2026 FIFA World Cup ${venue.name} Venue Guide | CupCalendar`, description: dict.desc, body: venuePage(venue, lang) }), "0.7");
    }

    await writeRoute(`/2026/${lang}/tools/`, layout({ route: `/2026/${lang}/tools/`, lang, title: `2026 FIFA World Cup ${dict.tools} | CupCalendar`, description: dict.desc, h1: `2026 FIFA World Cup ${dict.tools}`, body: toolsPage(lang) }), "0.85");
    await writeRoute(`/2026/${lang}/history/`, layout({ route: `/2026/${lang}/history/`, lang, title: `2026 FIFA World Cup ${dict.history} | CupCalendar`, description: dict.desc, h1: `2026 FIFA World Cup ${dict.history}`, body: historyPage(lang) }), "0.72");
    await writeRoute(`/2026/${lang}/news/`, layout({ route: `/2026/${lang}/news/`, lang, title: `2026 FIFA World Cup ${dict.news} | CupCalendar`, description: dict.desc, h1: `2026 FIFA World Cup ${dict.news}`, body: newsPage(lang) }), "0.7");

    for (const match of data.matches) {
      await writeRoute(`/2026/${lang}/matches/${match.id}/`, layout({ route: `/2026/${lang}/matches/${match.id}/`, lang, title: `2026 FIFA World Cup ${match.home} vs ${match.away} Match Center | CupCalendar`, description: dict.desc, h1: `2026 FIFA World Cup ${match.home} vs ${match.away}`, body: matchDetailPage(match, lang) }), "0.7");
    }

    await writeRoute(`/2026/${lang}/privacy/`, simplePolicy(`/2026/${lang}/privacy/`, lang, "Privacy Policy", "Privacy Policy"), "0.2");
    await writeRoute(`/2026/${lang}/terms/`, simplePolicy(`/2026/${lang}/terms/`, lang, "Terms of Service", "Terms of Service"), "0.2");
  }

  // 最终组装生成多语言全站站点地图 Sitemap 与 爬虫控制规范
  await writeFile(path.join(dist, "2026/sitemap.xml"), sitemap());
  await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${data.domain}/2026/sitemap.xml\n`);

  console.log(`Successfully compiled multi-language localized portal with Google Analytics & AdSense integrated! Total routes: ${pageList.length}`);
}

build().catch(console.error);
