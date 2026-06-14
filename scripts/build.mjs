import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const data = JSON.parse(await readFile(path.join(root, "data/site.json"), "utf8"));

const pageList = [];

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

function layout({ route, title, description, active, h1, intro, body, jsonLd, extraHead = "" }) {
  const canonical = pageUrl(route);
  const current = (href) => (href === route || (href !== "/2026/" && route.startsWith(href)) ? ' aria-current="page"' : "");
  const languageLinks = data.languages
    .map((lang) => `<link rel="alternate" hreflang="${lang.code}" href="${data.domain}/2026/${lang.code}/">`)
    .join("\n");

  return `<!doctype html>
<html lang="en" data-kickoff="${esc(data.openingDate)}">
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
  <script type="application/ld+json">${JSON.stringify(jsonLd || baseJsonLd(route))}</script>
  ${extraHead}
</head>
<body>
  <header class="topbar">
    <div class="nav-shell">
      <a class="brand" href="/2026/" aria-label="CupCalendar 2026 home">
        <span class="brand-mark">C</span>
        <span>CupCalendar 2026</span>
      </a>
      <nav class="desktop-nav" aria-label="Primary">
        ${data.nav.map((item) => `<a href="${item.href}"${current(item.href)}>${item.label}</a>`).join("")}
      </nav>
      <div class="nav-actions">
        <label class="search">
          <span aria-hidden="true">Search</span>
          <input type="search" placeholder="Search teams, venues...">
        </label>
        <button class="icon-btn" aria-label="Change language" title="Language">Lang</button>
        <button class="icon-btn" data-menu-button aria-expanded="false" aria-label="Open menu">Menu</button>
      </div>
    </div>
    <nav class="mobile-menu" aria-label="Mobile">
      ${data.nav.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
    </nav>
  </header>
  <main>
    ${h1 ? `<section class="container section page-title"><div><h1>${esc(h1)}</h1>${intro ? `<p>${esc(intro)}</p>` : ""}</div></section>` : ""}
    ${body}
  </main>
  <nav class="bottom-tabs" aria-label="Quick navigation">
    <a href="/2026/schedule/">Schedule</a>
    <a href="/2026/schedule/#standings">Standings</a>
    <a href="/2026/teams/">Follow</a>
  </nav>
  <footer class="footer">
    <div class="container footer-grid">
      <div>
        <h2>CupCalendar 2026</h2>
        <p>Independent 2026 FIFA World Cup calendar, schedule, teams, venues, and fan tools. CupCalendar is not affiliated with FIFA.</p>
      </div>
      <div>
        <h3>Popular Links</h3>
        <a href="/2026/schedule/">2026 World Cup Schedule</a>
        <a href="/2026/teams/">2026 FIFA World Cup Teams</a>
        <a href="/2026/tools/">Calendar Subscription</a>
      </div>
      <div>
        <h3>Legal</h3>
        <a href="/2026/privacy/">Privacy Policy</a>
        <a href="/2026/terms/">Terms of Service</a>
        <a href="/2026/sitemap.xml">2026 Sitemap</a>
      </div>
    </div>
  </footer>
  <script src="${asset("app.js")}" defer></script>
</body>
</html>`;
}

function matchCard(match) {
  const statusClass = match.status.toLowerCase().includes("live") || match.status.toLowerCase().includes("upcoming") ? "" : " muted";
  return `<article class="match-card" data-match-start="${isoStart(match)}" data-match-label="${esc(match.home)} vs ${esc(match.away)}" data-match-id="${esc(match.id)}" data-match-venue="${esc(match.venue)}">
    <div class="match-meta">
      <strong>${esc(match.venue)}, ${esc(match.city)}</strong>
      <span class="match-time">${esc(match.time)}</span>
      <span>${esc(match.group)} · ${esc(match.matchday)}</span>
    </div>
    <div class="scoreline">
      <div><span class="team-badge">${esc(match.homeCode)}</span><strong>${esc(match.home)}</strong></div>
      <div><div class="score">${esc(match.score)}</div><div class="prediction">Projected: ${esc(match.prediction)}</div></div>
      <div><span class="team-badge">${esc(match.awayCode)}</span><strong>${esc(match.away)}</strong></div>
    </div>
    <div class="match-actions">
      <span class="status${statusClass}">${esc(match.status)}</span>
      <a class="btn secondary" href="/2026/matches/${esc(match.id)}/">Match Center</a>
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

function homePage() {
  const body = `<section class="container">
    <div class="hero">
      <div class="hero-copy">
        <span class="eyebrow">2026-first SEO hub · cupcalendar.xyz/2026/</span>
        <h1>2026 FIFA World Cup Schedule, Teams & Calendar</h1>
        <p>Follow every match across the United States, Canada, and Mexico with local kick-off times, standings, team profiles, venue guides, and one-click calendar tools.</p>
        <div class="countdown" data-countdown aria-label="Countdown to kickoff">
          <div><strong data-unit="days">0</strong><span>Days</span></div>
          <div><strong data-unit="hours">00</strong><span>Hours</span></div>
          <div><strong data-unit="minutes">00</strong><span>Minutes</span></div>
          <div><strong data-unit="seconds">00</strong><span>Seconds</span></div>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="/2026/schedule/">View 2026 Schedule</a>
          <a class="btn ghost" href="/2026/tools/">Get Calendar Feed</a>
        </div>
      </div>
      <div class="hero-media"><img src="${asset("hero-stadium.png")}" alt="Modern soccer stadium with match calendar data screens" loading="eager"></div>
    </div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>Today & Tomorrow Focus</h2><p>Fast match cards designed for fans who need time, venue, teams, status, and ticket paths in one scan.</p></div><a class="btn secondary" href="/2026/schedule/">Full Schedule</a></div>
    ${data.matches.slice(0, 3).map(matchCard).join("")}
  </section>
  <section class="container section">
    <div class="layout">
      <div class="grid two">
        ${standingsTable(data.standings[0])}
        <section class="panel">
          <h2>Latest 2026 World Cup News</h2>
          <div class="news-list">${data.news.map((item) => `<article class="news-item"><div class="news-thumb">${esc(item.tag)}</div><div><span class="chip">${esc(item.source)}</span><h3>${esc(item.title)}</h3><p class="muted">${esc(item.time)}</p></div></article>`).join("")}</div>
        </section>
      </div>
      <aside class="side-stack">
        <div class="ad-slot">AdSpace<br>300 x 250</div>
        <section class="panel"><h2>SEO Recovery Plan</h2><p>All priority pages live under <strong>/2026/</strong>, with titles, H1 copy, canonical URLs, JSON-LD, and a dedicated <a href="/2026/sitemap.xml">2026 sitemap</a>.</p></section>
      </aside>
    </div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>2026 FIFA World Cup Teams</h2><p>Searchable team cards, rankings, regions, squad depth, and history.</p></div><a class="btn secondary" href="/2026/teams/">All Teams</a></div>
    <div class="grid four">${data.teams.map(teamCard).join("")}</div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>Venue Guide</h2><p>Host city cards prepared for long-form SEO venue guides, transport notes, and match lists.</p></div><a class="btn secondary" href="/2026/venues/">All Venues</a></div>
    <div class="grid four">${data.venues.map(venueCard).join("")}</div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>World Cup History Snapshot</h2><p>Recent champions and all-time scorers to strengthen internal links and evergreen discovery.</p></div><a class="btn secondary" href="/2026/history/">History Data</a></div>
    <div class="grid two">
      <section class="panel"><h3>Recent Champions</h3>${championsTable()}</section>
      <section class="panel"><h3>All-Time Scorers Top 5</h3>${scorersTable()}</section>
    </div>
  </section>`;

  return layout({
    route: "/2026/",
    active: "home",
    title: "2026 FIFA World Cup Schedule, Teams & Calendar | CupCalendar",
    description: "CupCalendar is a 2026 FIFA World Cup schedule, standings, teams, venues, history, and calendar subscription portal.",
    body,
    jsonLd: baseJsonLd("/2026/", { name: "2026 FIFA World Cup Schedule, Teams & Calendar | CupCalendar" })
  });
}

function teamCard(team) {
  return `<article class="team-card" data-team-card="${esc(`${team.name} ${team.code} ${team.region}`)}">
    <a href="/2026/teams/${esc(team.slug)}/">
      <div class="flag-tile">${esc(team.code)}</div>
      <div class="card-title"><span>${esc(team.name)}</span><span class="chip">#${team.ranking}</span></div>
      <p class="muted">${esc(team.region)} · ${team.titles} World Cup titles</p>
    </a>
  </article>`;
}

function venueCard(venue) {
  return `<article class="venue-card">
    <a href="/2026/venues/${esc(venue.slug)}/">
      <div class="venue-media" role="img" aria-label="${esc(venue.name)} stadium preview"></div>
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

function schedulePage() {
  const grouped = groupMatches(data.matches);
  const dates = Object.keys(grouped).sort();
  const body = `<section class="container section">
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
            <a class="btn secondary" href="/2026/tools/">Subscribe</a>
          </div>
          <div class="date-strip">${dates.map((date, index) => `<a class="date-pill ${index === 1 ? "active" : ""}" href="#date-${date}"><span>${slugifyDate(date)}</span><strong>${new Date(`${date}T00:00:00`).toLocaleDateString("en", { weekday: "short" })}</strong></a>`).join("")}</div>
        </section>
        ${dates.map((date) => `<section class="section" id="date-${date}"><h2>${esc(slugifyDate(date))} · 2026 FIFA World Cup Matches</h2>${grouped[date].map(matchCard).join("")}</section>`).join("")}
        <section class="section" id="standings"><div class="grid two">${data.standings.map(standingsTable).join("")}</div></section>
        <section class="section" id="bracket"><div class="panel"><h2>2026 FIFA World Cup Knockout Bracket</h2><p class="muted">Bracket nodes are reserved for live knockout updates once the group stage is complete.</p><div class="grid four">${["Round of 32", "Round of 16", "Quarter-finals", "Final"].map((label) => `<div class="card"><strong>${label}</strong><p class="muted">TBD vs TBD</p></div>`).join("")}</div></div></section>
      </div>
      <aside class="side-stack">
        <div class="ad-slot">AdSpace<br>300 x 250</div>
        ${standingsTable(data.standings[0])}
      </aside>
    </div>
  </section>`;

  return layout({
    route: "/2026/schedule/",
    title: "2026 World Cup Schedule & Standings | CupCalendar",
    description: "Browse the 2026 FIFA World Cup schedule, match times, venues, standings, and knockout bracket on CupCalendar.",
    h1: "2026 FIFA World Cup Schedule & Standings",
    intro: "Filter matchdays, scan live-ready match cards, compare group tables, and subscribe to calendar updates.",
    body,
    jsonLd: baseJsonLd("/2026/schedule/", { name: "2026 World Cup Schedule & Standings | CupCalendar" })
  });
}

function teamsPage() {
  const body = `<section class="container section">
    <div class="toolbar">
      <input data-team-search type="search" placeholder="Search teams by country, code, or confederation" aria-label="Search teams">
      <a class="btn secondary" href="/2026/schedule/">View Team Fixtures</a>
    </div>
    <div class="grid four section">${data.teams.map(teamCard).join("")}</div>
  </section>`;

  return layout({
    route: "/2026/teams/",
    title: "2026 FIFA World Cup Teams & Squads | CupCalendar",
    description: "Explore 2026 FIFA World Cup teams, FIFA rankings, squads, confederations, coaches, captains, and team histories.",
    h1: "2026 FIFA World Cup Teams & Squads",
    intro: "Team profiles combine rankings, squad lists, recent form, schedule links, and historical World Cup records.",
    body,
    jsonLd: baseJsonLd("/2026/teams/", { name: "2026 FIFA World Cup Teams & Squads | CupCalendar" })
  });
}

function teamPage(team) {
  const teamMatches = data.matches.filter((match) => match.home === team.name || match.away === team.name);
  const body = `<section class="container section">
    <header class="panel profile-header">
      <div class="profile-main">
        <div class="flag-tile">${esc(team.code)}</div>
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
        <section class="panel"><h2>${esc(team.name)} 2026 Fixtures</h2>${teamMatches.length ? teamMatches.map(matchCard).join("") : "<p class=\"muted\">Fixtures will appear here once the draw is complete.</p>"}</section>
        <div class="ad-slot">AdSpace<br>336 x 280</div>
      </aside>
    </div>
  </section>`;

  return layout({
    route: `/2026/teams/${team.slug}/`,
    title: `2026 FIFA World Cup ${team.name} Team Profile & Squad | CupCalendar`,
    description: `${team.name} 2026 FIFA World Cup team profile with squad, coach, captain, fixtures, recent form, and World Cup history.`,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SportsTeam",
      name: team.name,
      sport: "Soccer",
      url: pageUrl(`/2026/teams/${team.slug}/`),
      memberOf: team.region
    }
  });
}

function venuesPage() {
  const body = `<section class="container section"><div class="grid four">${data.venues.map(venueCard).join("")}</div></section>`;
  return layout({
    route: "/2026/venues/",
    title: "2026 FIFA World Cup Venues & Host Cities | CupCalendar",
    description: "Explore 2026 FIFA World Cup stadiums, host cities, capacities, match counts, and travel guide entry points.",
    h1: "2026 FIFA World Cup Venues & Host Cities",
    intro: "A host-city guide prepared for venue facts, transport notes, accommodation context, and match lists.",
    body
  });
}

function venuePage(venue) {
  const matches = data.matches.filter((match) => match.venue === venue.name);
  const body = `<section class="container section">
    <div class="layout">
      <article class="panel">
        <div class="venue-media" style="height:260px"></div>
        <h2>${esc(venue.name)} 2026 World Cup Guide</h2>
        <p>${esc(venue.name)} in ${esc(venue.city)} is part of the 2026 FIFA World Cup host network. This page is structured for capacity facts, match schedule links, transport advice, accommodation notes, and map embeds.</p>
        <div class="grid three">
          <div class="card"><strong>City</strong><p>${esc(venue.city)}, ${esc(venue.country)}</p></div>
          <div class="card"><strong>Capacity</strong><p>${esc(venue.capacity)}</p></div>
          <div class="card"><strong>Planned matches</strong><p>${venue.matches}</p></div>
        </div>
        <h2>Matches at ${esc(venue.name)}</h2>
        ${matches.length ? matches.map(matchCard).join("") : "<p class=\"muted\">Match assignments will be updated when official fixtures are confirmed.</p>"}
      </article>
      <aside class="side-stack"><div class="ad-slot">AdSpace<br>300 x 250</div><section class="panel"><h2>Travel Notes</h2><p class="muted">Add airport, transit, lodging, and neighborhood guidance here for long-tail SEO.</p></section></aside>
    </div>
  </section>`;
  return layout({
    route: `/2026/venues/${venue.slug}/`,
    title: `2026 FIFA World Cup ${venue.name} Venue Guide | CupCalendar`,
    description: `${venue.name} 2026 FIFA World Cup venue guide with capacity, host city details, fixtures, and travel planning notes.`,
    h1: `2026 FIFA World Cup ${venue.name} Venue Guide`,
    body
  });
}

function toolsPage() {
  const body = `<section class="container section">
    <div class="tools-grid">
      <section class="tool-panel">
        <h2>2026 World Cup Calendar Subscription</h2>
        <p class="muted">Download an ICS file for sample 2026 FIFA World Cup fixtures and import it into Google, Outlook, or Apple Calendar.</p>
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
    <div class="ad-slot banner">AdSpace · 728 x 90</div>
  </section>`;
  return layout({
    route: "/2026/tools/",
    title: "2026 FIFA World Cup Calendar Tools & Timezone Converter | CupCalendar",
    description: "Download a 2026 FIFA World Cup ICS calendar, convert match times by timezone, and find ticket information links.",
    h1: "2026 FIFA World Cup Calendar Tools",
    intro: "Subscribe to match fixtures, convert kick-off times, and keep ticket links in one practical fan toolkit.",
    body
  });
}

function historyPage() {
  const body = `<section class="container section"><div class="grid two"><section class="panel"><h2>Previous World Cup Champions</h2>${championsTable()}</section><section class="panel"><h2>All-Time Scorers</h2>${scorersTable()}</section></div></section>`;
  return layout({
    route: "/2026/history/",
    title: "2026 FIFA World Cup History, Champions & Top Scorers | CupCalendar",
    description: "World Cup champions, final scores, host nations, and all-time top scorers for CupCalendar's 2026 tournament hub.",
    h1: "2026 FIFA World Cup History Data",
    intro: "Evergreen context for champions, finals, and top scorers that supports internal discovery across the 2026 hub.",
    body
  });
}

function newsPage() {
  const body = `<section class="container section"><div class="layout"><div class="news-list">${data.news.map((item) => `<article class="news-item"><div class="news-thumb">${esc(item.tag)}</div><div><span class="chip">${esc(item.source)}</span><h2>${esc(item.title)}</h2><p class="muted">${esc(item.time)} · RSS aggregation placeholder</p></div></article>`).join("")}</div><aside class="side-stack"><div class="ad-slot">AdSpace<br>300 x 250</div><section class="panel"><h2>Refresh Plan</h2><p class="muted">The product plan calls for RSS polling every five minutes during active news windows.</p></section></aside></div></section>`;
  return layout({
    route: "/2026/news/",
    title: "2026 FIFA World Cup News & Updates | CupCalendar",
    description: "Aggregated 2026 FIFA World Cup news, official updates, previews, analysis, and matchday story links.",
    h1: "2026 FIFA World Cup News & Updates",
    intro: "Official updates, previews, matchday analysis, and RSS-ready story cards.",
    body
  });
}

function matchDetailPage(match) {
  const body = `<section class="container section">
    <div class="panel">
      <div class="language-row"><span class="chip">${esc(match.group)}</span><span class="chip">${esc(match.matchday)}</span><span class="status">${esc(match.status)}</span></div>
      <div class="scoreline" style="margin:40px auto;max-width:720px">
        <div><span class="team-badge">${esc(match.homeCode)}</span><h2>${esc(match.home)}</h2></div>
        <div><div class="score">${esc(match.score)}</div></div>
        <div><span class="team-badge">${esc(match.awayCode)}</span><h2>${esc(match.away)}</h2></div>
      </div>
    </div>
    <div class="grid two section">
      <section class="panel"><h2>Match Information</h2><table><tbody><tr><td>Kick-off</td><td>${esc(match.date)} ${esc(match.time)} local</td></tr><tr><td>Venue</td><td>${esc(match.venue)}</td></tr><tr><td>City</td><td>${esc(match.city)}</td></tr><tr><td>Prediction</td><td>${esc(match.prediction)}</td></tr></tbody></table></section>
      <section class="panel"><h2>Match Stats</h2><div class="stats-list">${["Possession", "Shots", "Shots on target", "Corners"].map((label, index) => `<div><div class="stat-row"><strong>${42 + index}</strong><span>${label}</span><strong>${58 - index}</strong></div><div class="track"><span style="width:${42 + index * 6}%"></span></div></div>`).join("")}</div></section>
      <section class="panel"><h2>Match Timeline</h2><div class="timeline"><div class="timeline-item"><h3>14' Goal</h3><p>Sample live event timeline placeholder.</p></div><div class="timeline-item"><h3>32' Card</h3><p>Discipline, substitutions, and VAR events will appear here.</p></div></div></section>
      <section class="panel"><h2>Prediction Poll</h2><div class="toolbar"><button class="btn secondary">${esc(match.home)} win</button><button class="btn secondary">Draw</button><button class="btn secondary">${esc(match.away)} win</button></div></section>
    </div>
  </section>`;
  return layout({
    route: `/2026/matches/${match.id}/`,
    title: `2026 FIFA World Cup ${match.home} vs ${match.away} Match Center | CupCalendar`,
    description: `${match.home} vs ${match.away} 2026 FIFA World Cup match center with kick-off time, venue, score, stats, and prediction poll.`,
    h1: `2026 FIFA World Cup ${match.home} vs ${match.away}`,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: `${match.home} vs ${match.away}`,
      startDate: isoStart(match),
      location: {
        "@type": "Place",
        name: match.venue,
        address: match.city
      },
      competitor: [
        { "@type": "SportsTeam", name: match.home },
        { "@type": "SportsTeam", name: match.away }
      ],
      url: pageUrl(`/2026/matches/${match.id}/`)
    }
  });
}

function simplePolicy(route, title, h1) {
  return layout({
    route,
    title,
    description: `${title} for CupCalendar 2026.`,
    h1,
    body: `<section class="container section"><article class="panel"><p class="muted">This placeholder page reserves the legal URL for launch. Add final policy copy before enabling analytics, ads, affiliate links, or user-submitted content.</p></article></section>`
  });
}

function sitemap() {
  const urls = pageList
    .filter((page) => page.route.startsWith("/2026/") && page.route !== "/2026/sitemap.xml")
    .map((page) => `  <url><loc>${pageUrl(page.route)}</loc><changefreq>daily</changefreq><priority>${page.priority}</priority></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });
await copyFile(path.join(root, "assets/styles.css"), path.join(dist, "assets/styles.css"));
await copyFile(path.join(root, "assets/app.js"), path.join(dist, "assets/app.js"));
await copyFile(path.join(root, "assets/hero-stadium.png"), path.join(dist, "assets/hero-stadium.png"));
await copyFile(path.join(root, "CNAME"), path.join(dist, "CNAME"));

await writeRoute("/", `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>2026 FIFA World Cup | CupCalendar</title><meta http-equiv="refresh" content="0; url=/2026/"><link rel="canonical" href="${data.domain}/2026/"></head><body><a href="/2026/">Continue to 2026 FIFA World Cup CupCalendar</a></body></html>`, "0.5");
await writeRoute("/2026/", homePage(), "1.0");
await writeRoute("/2026/schedule/", schedulePage(), "0.95");
await writeRoute("/2026/teams/", teamsPage(), "0.9");
for (const team of data.teams) await writeRoute(`/2026/teams/${team.slug}/`, teamPage(team), "0.82");
await writeRoute("/2026/venues/", venuesPage(), "0.82");
for (const venue of data.venues) await writeRoute(`/2026/venues/${venue.slug}/`, venuePage(venue), "0.7");
await writeRoute("/2026/tools/", toolsPage(), "0.85");
await writeRoute("/2026/history/", historyPage(), "0.72");
await writeRoute("/2026/news/", newsPage(), "0.7");
for (const match of data.matches) await writeRoute(`/2026/matches/${match.id}/`, matchDetailPage(match), "0.7");
await writeRoute("/2026/privacy/", simplePolicy("/2026/privacy/", "Privacy Policy | CupCalendar", "Privacy Policy"), "0.2");
await writeRoute("/2026/terms/", simplePolicy("/2026/terms/", "Terms of Service | CupCalendar", "Terms of Service"), "0.2");

await writeFile(path.join(dist, "2026/sitemap.xml"), sitemap());
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${data.domain}/2026/sitemap.xml\n`);

console.log(`Built ${pageList.length} routes into dist/`);
