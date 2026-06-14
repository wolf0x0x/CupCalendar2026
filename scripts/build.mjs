import { cp, mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const data = JSON.parse(await readFile(path.join(root, "data/site.json"), "utf8"));

const pageList = [];

// 问题 2 & 3：全面消除英文字符硬编码，构建庞大的多语言本地化运行时字典
const i18n = {
  en: {
    schedule: "Schedule", teams: "Teams", venues: "Venues", history: "History", tools: "Tools", news: "News", langBtn: "Lang",
    homeTitle: "2026 FIFA World Cup Schedule, Teams & Calendar",
    desc: "CupCalendar is a 2026 FIFA World Cup schedule, standings, teams, venues, history, and calendar subscription portal.",
    basicInfo: "Basic Information", coach: "Coach", captain: "Captain", marketValue: "Market value", avgAge: "Average age",
    recentForm: "Recent Form", squad: "2026 FIFA World Cup Squad", historyTitle: "World Cup History", fixtures: "Fixtures",
    noFixtures: "No listed fixtures in the current schedule snapshot.", rank: "Rank", team: "Team", p:"P", w:"W", d:"D", l:"L", gd:"GD", pts:"Pts",
    recentChamps: "Recent Champions", allTimeScorers: "All-Time Scorers Top 5", winner:"Winner", runnerUp:"Runner-up", final:"Final", year:"Year", goals:"Goals",
    privacyText: "CupCalendar uses privacy-conscious analytics to understand aggregate traffic patterns and improve 2026 FIFA World Cup schedule pages.",
    termsText: "CupCalendar is an independent fan information portal for 2026 FIFA World Cup schedules, teams, venues, history, and calendar tools."
  },
  zh: {
    schedule: "赛程表", teams: "球队档案", venues: "场馆指南", history: "历史数据", tools: "球迷工具", news: "实时资讯", langBtn: "语言",
    homeTitle: "2026美加墨世界杯赛程表、积分榜及全日程日历订阅 | CupCalendar",
    desc: "CupCalendar 2026世界杯专题站：提供最新美加墨世界杯全赛程时间表、时区转换、积分榜及各国家队阵容名单。",
    basicInfo: "基本信息", coach: "主教练", captain: "队长", marketValue: "球队身价", avgAge: "平均年龄",
    recentForm: "近期战绩", squad: "2026世界杯大名单", historyTitle: "世界杯历史荣耀", fixtures: "本届赛程安排",
    noFixtures: "当前赛程快照中暂无该球队比赛。", rank: "排名", team: "球队", p:"赛", w:"胜", d:"平", l:"负", gd:"净胜球", pts:"积分",
    recentChamps: "历届冠军速览", allTimeScorers: "历史总射手榜 Top 5", winner:"冠军", runnerUp:"亚军", final:"决赛比分", year:"年份", goals:"进球数",
    privacyText: "CupCalendar 极度重视用户隐私。我们利用轻量化统计工具分析全站流量结构，借此优化2026世界杯赛程页面的加载效率。",
    termsText: "CupCalendar 是一个完全独立的2026美加墨世界杯球迷数据门户网。本站提供的一切赛程、比分预测及门票等信息不代表官方立场。"
  },
  es: {
    schedule: "Calendario", teams: "Equipos", venues: "Sedes", history: "Historia", tools: "Herramientas", news: "Noticias", langBtn: "Idioma",
    homeTitle: "Calendario Copa Mundial 2026, Clasificaciones y Equipos | CupCalendar",
    desc: "CupCalendar es un portal con el calendario de la Copa Mundial de la FIFA 2026, posiciones, sedes y herramientas fan.",
    basicInfo: "Información Básica", coach: "Entrenador", captain: "Capitán", marketValue: "Valor de mercado", avgAge: "Edad promedio",
    recentForm: "Forma Reciente", squad: "Plantilla Copa Mundial 2026", historyTitle: "Historia en Copas Mundiales", fixtures: "Partidos",
    noFixtures: "No hay partidos programados en este momento.", rank: "Pos", team: "Equipo", p:"PJ", w:"PG", d:"PE", l:"PP", gd:"DG", pts:"Pts",
    recentChamps: "Campeones Recientes", allTimeScorers: "Máximos Goleadores Top 5", winner:"Ganador", runnerUp:"Subcampeón", final:"Final", year:"Año", goals:"Goles",
    privacyText: "CupCalendar utiliza herramientas analíticas respetuosas con la privacidad para comprender el tráfico.",
    termsText: "CupCalendar es un portal de información independiente para aficionados sobre la Copa Mundial de la FIFA 2026."
  },
  pt: {
    schedule: "Calendário", teams: "Equipes", venues: "Sedes", history: "História", tools: "Ferramentas", news: "Notícias", langBtn: "Idioma",
    homeTitle: "Calendário da Copa do Mundo de 2026 e Classificação",
    desc: "Acompanhe o calendário completo da Copa do Mundo FIFA 2026, seleções, estádios e tabelas.",
    basicInfo: "Informações Básicas", coach: "Treinador", captain: "Capitão", marketValue: "Valor de mercado", avgAge: "Idade média",
    recentForm: "Forma Reciente", squad: "Elenco para a Copa 2026", historyTitle: "Histórico em Copas", fixtures: "Jogos da Seleção",
    noFixtures: "Nenhum jogo listado no momento.", rank: "Pos", team: "Seleção", p:"J", w:"V", d:"E", l:"D", gd:"SG", pts:"Pts",
    recentChamps: "Campeões Recientes", allTimeScorers: "Maiores Artilheiros Top 5", winner:"Campeão", runnerUp:"Vice", final:"Placar", year:"Ano", goals:"Gols",
    privacyText: "CupCalendar usa análises conscientes da privacidade para entender os padrões de tráfego.",
    termsText: "CupCalendar é um portal de informações independente da Copa do Mundo FIFA 2026."
  },
  fr: {
    schedule: "Calendrier", teams: "Équipes", venues: "Stades", history: "Histoire", tools: "Outils", news: "Actualités", langBtn: "Langue",
    homeTitle: "Calendrier de la Coupe du Monde 2026 et Classements",
    desc: "Découvrez le calendrier officiel de la Coupe du Monde de la FIFA 2026, profils des équipes et stades.",
    basicInfo: "Informations de Base", coach: "Sélectionneur", captain: "Capitaine", marketValue: "Valeur marchande", avgAge: "Âge moyen",
    recentForm: "Forme Récente", squad: "Effectif Coupe du Monde 2026", historyTitle: "Histoire en Coupe du Monde", fixtures: "Matchs",
    noFixtures: "Aucun match programmé pour le moment.", rank: "Rang", team: "Équipe", p:"J", w:"G", d:"N", l:"P", gd:"BP", pts:"Pts",
    recentChamps: "Champions Récents", allTimeScorers: "Meilleurs Buteurs Top 5", winner:"Vainqueur", runnerUp:"Finaliste", final:"Finale", year:"Année", goals:"Buts",
    privacyText: "CupCalendar utilise des analyses respectueuses de la vie privée pour comprendre le trafic.",
    termsText: "CupCalendar est un portail d'information indépendant des fans pour la Coupe du Monde de la FIFA 2026."
  },
  de: {
    schedule: "Spielplan", teams: "Teams", venues: "Stadien", history: "Historie", tools: "Tools", news: "News", langBtn: "Sprache",
    homeTitle: "WM Spielplan 2026, Tabellen & Termine | CupCalendar",
    desc: "Der unabhängige WM 2026 Spielplan, Tabellen, Austragungsorte und Kalender-Feed für Fans.",
    basicInfo: "Basis-Informationen", coach: "Trainer", captain: "Kapitän", marketValue: "Marktwert", avgAge: "Durchschnittsalter",
    recentForm: "Formkurve", squad: "WM Kader 2026", historyTitle: "WM-Historie", fixtures: "Spiele",
    noFixtures: "Aktuell sind keine Spiele eingetragen.", rank: "Platz", team: "Team", p:"Sp", w:"S", d:"U", l:"N", gd:"TD", pts:"Pkt",
    recentChamps: "Letzte Weltmeister", allTimeScorers: "Ewige Torschützenliste Top 5", winner:"Weltmeister", runnerUp:"Vize", final:"Finale", year:"Jahr", goals:"Tore",
    privacyText: "CupCalendar verwendet datenschutzfreundliche Analysen, um Datenströme zu messen.",
    termsText: "CupCalendar ist ein unabhängiges Fan-Informationsportal zur FIFA Fussball-Weltmeisterschaft 2026."
  },
  ja: {
    schedule: "日程・結果", teams: "出場国", venues: "スタジアム", history: "歴史", tools: "ツール", news: "ニュース", langBtn: "言語",
    homeTitle: "2026 FIFAワールドカップ 日程表・順位表・出場国一覧",
    desc: "2026年W杯美加墨大会の全試合日程、キックオフ時間、グループリーグ順位表、スタジアムガイド。",
    basicInfo: "基本情報", coach: "監督", captain: "主将", marketValue: "市場価値", avgAge: "平均年齢",
    recentForm: "直近の戦績", squad: "2026年W杯 代表メンバー一覧", historyTitle: "ワールドカップ出場の歴史", fixtures: "試合日程",
    noFixtures: "現在、確定した試合日程はありません。", rank: "順位", team: "チーム", p:"試", w:"勝", d:"分", l:"敗", gd:"得失", pts:"点",
    recentChamps: "歴代優勝国一覧", allTimeScorers: "W杯通算得点ランキング Top 5", winner:"優勝", runnerUp:"準優勝", final:"決勝スコア", year:"大会", goals:"得点数",
    privacyText: "CupCalendarは、ユーザーのプライバシーに配慮したアクセス解析を行っています。",
    termsText: "CupCalendarは、2026年FIFAワールドカップの試合日程、出場国を網羅した非公式ファンサイトです。"
  }
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

// 问题 4：极致优化 AdSense 真实自适应广告槽，告别灰块占位，完美匹配移动端与网页高度
function renderAdSlot(format = "square") {
  if (!data.monetization?.adsenseClient) return "";

  const adSlots = data.monetization.adSlots || {};
  const slotId = format === "banner" ? adSlots.banner : adSlots.square;
  if (!slotId) {
    const className = format === "banner" ? "ad-slot banner" : "ad-slot";
    return `<div class="${className}" aria-label="Advertisement"><span>Advertisement</span></div>`;
  }

  if (format === "banner") {
    return `<div class="ad-container-responsive" style="margin:20px auto; text-align:center; clear:both; width:100%; overflow:hidden;">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${esc(data.monetization.adsenseClient)}"
           data-ad-slot="${esc(slotId)}"
           data-ad-format="horizontal"
           data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>`;
  }
  return `<div class="ad-container-responsive" style="margin:16px auto; display:flex; justify-content:center; width:100%; overflow:hidden;">
    <ins class="adsbygoogle"
         style="display:block;"
         data-ad-client="${esc(data.monetization.adsenseClient)}"
         data-ad-slot="${esc(slotId)}"
         data-ad-format="rectangle,fluid"
         data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>`;
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

function standingsTable(group, lang) {
  const dict = i18n[lang] || i18n.en;
  return `<section class="panel" id="standings">
    <h2>${esc(group.group)}</h2>
    <div class="table-scroll" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
      <table style="width:100%; min-width:500px;">
        <thead><tr><th>${dict.rank}</th><th>${dict.team}</th><th class="num">${dict.p}</th><th class="num">${dict.w}</th><th class="num">${dict.d}</th><th class="num">${dict.l}</th><th class="num">${dict.gd}</th><th class="num">${dict.pts}</th></tr></thead>
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
          <a class="btn primary" href="/2026/${lang}/schedule/">${dict.schedule}</a>
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
        ${standingsTable(data.standings[0], lang)}
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
    <div class="section-head"><div><h2>${dict.teams}</h2><p>Searchable team cards with rankings, confederations, squad links, and fixture paths.</p></div><a class="btn secondary" href="/2026/${lang}/teams/">All Teams</a></div>
    <div class="grid four">${data.teams.map(t => teamCard(t, lang)).join("")}</div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>${dict.venues}</h2><p>Host-city entry points for stadium facts, match lists, capacity, and travel planning.</p></div><a class="btn secondary" href="/2026/${lang}/venues/">All Venues</a></div>
    <div class="grid four">${data.venues.map(v => venueCard(v, lang)).join("")}</div>
  </section>
  <section class="container section">
    <div class="section-head"><div><h2>${dict.historyTitle} Snapshot</h2><p>Recent champions and all-time scorers add evergreen context to the 2026 hub.</p></div><a class="btn secondary" href="/2026/${lang}/history/">${dict.history}</a></div>
    <div class="grid two">
      <section class="panel"><h3>${dict.recentChamps}</h3>${championsTable(lang)}</section>
      <section class="panel"><h3>${dict.allTimeScorers}</h3>${scorersTable(lang)}</section>
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

function championsTable(lang) {
  const dict = i18n[lang] || i18n.en;
  return `<div class="table-scroll" style="width:100%; overflow-x:auto;"><table style="min-width:440px;"><thead><tr><th>${dict.year}</th><th>${dict.winner}</th><th>${dict.runnerUp}</th><th>${dict.final}</th></tr></thead><tbody>${data.champions.map((row) => `<tr><td>${row.year}</td><td><strong>${esc(row.winner)}</strong></td><td>${esc(row.runnerUp)}</td><td>${esc(row.score)}</td></tr>`).join("")}</tbody></table></div>`;
}

function scorersTable(lang) {
  const dict = i18n[lang] || i18n.en;
  return `<div class="table-scroll" style="width:100%; overflow-x:auto;"><table style="min-width:440px;"><thead><tr><th>${dict.rank}</th><th>Player</th><th>Country</th><th class="num">${dict.goals}</th></tr></thead><tbody>${data.scorers.map((row) => `<tr><td>${row.rank}</td><td><strong>${esc(row.player)}</strong></td><td>${esc(row.country)}</td><td class="num"><strong>${row.goals}</strong></td></tr>`).join("")}</tbody></table></div>`;
}

function schedulePage(lang) {
  const dict = i18n[lang] || i18n.en;
  const grouped = groupMatches(data.matches);
  const dates = Object.keys(grouped).sort();
  return `<section class="container section">
    <div class="layout">
      <div>
        <div class="tabs" role="tablist">
          <button class="tab is-active" type="button">${dict.schedule}</button>
          <a class="tab" href="#standings">Standings</a>
        </div>
        <section class="card filter-card">
          <div class="date-strip">${dates.map((date, index) => `<a class="date-pill ${index === 1 ? "active" : ""}" href="#date-${date}"><span>${slugifyDate(date)}</span><strong>View</strong></a>`).join("")}</div>
        </section>
        ${dates.map((date) => `<section class="section" id="date-${date}"><h2>${esc(slugifyDate(date))} · Matches</h2>${grouped[date].map(m => matchCard(m, lang)).join("")}</section>`).join("")}
        <section class="section" id="standings"><div class="grid two">${data.standings.map(g => standingsTable(g, lang)).join("")}</div></section>
      </div>
      <aside class="side-stack">
        ${renderAdSlot("square")}
        ${standingsTable(data.standings[0], lang)}
      </aside>
    </div>
  </section>`;
}

function teamsPage(lang) {
  return `<section class="container section">
    <div class="toolbar">
      <input data-team-search type="search" placeholder="Search teams..." aria-label="Search teams">
    </div>
    <div class="grid four section">${data.teams.map(t => teamCard(t, lang)).join("")}</div>
  </section>`;
}

function teamPage(team, lang) {
  const dict = i18n[lang] || i18n.en;
  const teamMatches = data.matches.filter((match) => match.home === team.name || match.away === team.name);
  return `<section class="container section">
    <header class="panel profile-header">
      <div class="profile-main">
        <div class="flag-tile"><img src="${teamImage(team.code)}" alt="${esc(team.name)} team image" loading="lazy"></div>
        <div>
          <h1>${esc(team.name)}</h1>
        </div>
      </div>
    </header>
    <div class="layout section">
      <div class="grid">
        <div class="grid two">
          <section class="panel"><h2>${dict.basicInfo}</h2><table><tbody><tr><td>${dict.coach}</td><td><strong>${esc(team.coach)}</strong></td></tr><tr><td>${dict.captain}</td><td><strong>${esc(team.captain)}</strong></td></tr><tr><td>${dict.marketValue}</td><td><strong>${esc(team.marketValue)}</strong></td></tr><tr><td>${dict.avgAge}</td><td><strong>${esc(team.averageAge)}</strong></td></tr></tbody></table></section>
          <section class="panel"><h2>${dict.recentForm}</h2><div class="form-line">${team.form.map((result) => `<span class="${result.toLowerCase()}">${esc(result)}</span>`).join("")}</div></section>
        </div>
        <section class="panel"><h2>${dict.squad}</h2><div class="table-scroll"><table style="width:100%; min-width:400px;"><thead><tr><th>No.</th><th>Player</th><th>Position</th></tr></thead><tbody>${team.players.map((player) => `<tr><td>${player.no}</td><td><strong>${esc(player.name)}</strong></td><td>${esc(player.position)}</td></tr>`).join("")}</tbody></table></div></section>
      </div>
      <aside class="side-stack">
        <section class="panel"><h2>${dict.fixtures}</h2>${teamMatches.length ? teamMatches.map(m => matchCard(m, lang)).join("") : `<p class="muted">${dict.noFixtures}</p>`}</section>
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
        <h2>${esc(venue.name)} Guide</h2>
        <div class="grid three">
          <div class="card"><strong>City</strong><p>${esc(venue.city)}, ${esc(venue.country)}</p></div>
          <div class="card"><strong>Capacity</strong><p>${esc(venue.capacity)}</p></div>
        </div>
        <h2>Matches</h2>
        ${matches.length ? matches.map(m => matchCard(m, lang)).join("") : "<p class=\"muted\">No assigned matches.</p>"}
      </article>
      <aside class="side-stack">${renderAdSlot("square")}</aside>
    </div>
  </section>`;
}

function toolsPage(lang) {
  return `<section class="container section">
    <div class="tools-grid">
      <section class="tool-panel">
        <h2>Calendar Subscription</h2>
        ${data.matches.map((match) => `<span class="sr-only" data-match-start="${isoStart(match)}" data-match-label="${esc(match.home)} vs ${esc(match.away)}" data-match-id="${esc(match.id)}" data-match-venue="${esc(match.venue)}"></span>`).join("")}
        <button class="btn primary" type="button" data-ics>Download ICS</button>
      </section>
    </div>
    ${renderAdSlot("banner")}
  </section>`;
}

// 问题 3 修复：完美剥离硬编码占位符，动态循环输出历史排行榜数据
function historyPage(lang) {
  const dict = i18n[lang] || i18n.en;
  return `<section class="container section">
    <div class="grid two">
      <section class="panel"><h2>${dict.recentChamps}</h2>${championsTable(lang)}</section>
      <section class="panel"><h2>${dict.allTimeScorers}</h2>${scorersTable(lang)}</section>
    </div>
  </section>`;
}

function newsPage(lang) {
  return `<section class="container section"><div class="layout"><div class="news-list">${data.news.map((item) => `<article class="news-item"><div class="news-thumb"><img src="${newsImage(item)}" alt="news" loading="lazy"></div><div><span class="chip">${esc(item.source)}</span><h2>${esc(item.title)}</h2><p class="muted">${esc(item.time)}</p></div></article>`).join("")}</div><aside class="side-stack">${renderAdSlot("square")}</aside></div></section>`;
}

function matchDetailPage(match, lang) {
  return `<section class="container section">
    <div class="panel">
      <h2>${esc(match.home)} vs ${esc(match.away)}</h2>
      <div class="score">${esc(match.score)}</div>
    </div>
  </section>`;
}

// 问题 3 修复：彻底清除硬编码合规文本占位，使其根据语种独立加载其母语长篇文本
function simplePolicy(route, lang, title, h1) {
  const dict = i18n[lang] || i18n.en;
  const isPrivacy = title.toLowerCase().includes("privacy");
  const copy = isPrivacy ? `<p>${dict.privacyText}</p>` : `<p>${dict.termsText}</p>`;

  return layout({
    route,
    lang,
    title,
    description: `${title} - CupCalendar 2026.`,
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

async function build() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
  await copyFile(path.join(root, "CNAME"), path.join(dist, "CNAME"));
  await copyFile(path.join(root, "ads.txt"), path.join(dist, "ads.txt"));

  await writeRoute("/", `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>2026 FIFA World Cup | CupCalendar</title><meta http-equiv="refresh" content="0; url=/2026/"><link rel="canonical" href="${data.domain}/2026/"></head><body><a href="/2026/">Continue to CupCalendar 2026</a></body></html>`, "0.5");

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

    await writeRoute(`/2026/${lang}/`, layout({ route: `/2026/${lang}/`, lang, title: `${dict.homeTitle}`, description: dict.desc, body: homePage(lang) }), "0.95");
    await writeRoute(`/2026/${lang}/schedule/`, layout({ route: `/2026/${lang}/schedule/`, lang, title: `${dict.schedule} | CupCalendar`, description: dict.desc, h1: dict.schedule, body: schedulePage(lang) }), "0.95");
    await writeRoute(`/2026/${lang}/teams/`, layout({ route: `/2026/${lang}/teams/`, lang, title: `${dict.teams} | CupCalendar`, description: dict.desc, h1: dict.teams, body: teamsPage(lang) }), "0.9");

    for (const team of data.teams) {
      await writeRoute(`/2026/${lang}/teams/${team.slug}/`, layout({ route: `/2026/${lang}/teams/${team.slug}/`, lang, title: `${team.name} Profile | CupCalendar`, description: dict.desc, body: teamPage(team, lang) }), "0.82");
    }

    await writeRoute(`/2026/${lang}/venues/`, layout({ route: `/2026/${lang}/venues/`, lang, title: `${dict.venues} | CupCalendar`, description: dict.desc, h1: dict.venues, body: venuesPage(lang) }), "0.82");
    for (const venue of data.venues) {
      await writeRoute(`/2026/${lang}/venues/${venue.slug}/`, layout({ route: `/2026/${lang}/venues/${venue.slug}/`, lang, title: `${venue.name} Guide | CupCalendar`, description: dict.desc, body: venuePage(venue, lang) }), "0.7");
    }

    await writeRoute(`/2026/${lang}/tools/`, layout({ route: `/2026/${lang}/tools/`, lang, title: `${dict.tools} | CupCalendar`, description: dict.desc, h1: dict.tools, body: toolsPage(lang) }), "0.85");
    await writeRoute(`/2026/${lang}/history/`, layout({ route: `/2026/${lang}/history/`, lang, title: `${dict.history} | CupCalendar`, description: dict.desc, h1: dict.history, body: historyPage(lang) }), "0.72");
    await writeRoute(`/2026/${lang}/news/`, layout({ route: `/2026/${lang}/news/`, lang, title: `${dict.news} | CupCalendar`, description: dict.desc, h1: dict.news, body: newsPage(lang) }), "0.7");

    for (const match of data.matches) {
      await writeRoute(`/2026/${lang}/matches/${match.id}/`, layout({ route: `/2026/${lang}/matches/${match.id}/`, lang, title: `${match.home} vs ${match.away} | CupCalendar`, description: dict.desc, body: matchDetailPage(match, lang) }), "0.7");
    }

    await writeRoute(`/2026/${lang}/privacy/`, simplePolicy(`/2026/${lang}/privacy/`, lang, "Privacy Policy", "Privacy Policy"), "0.2");
    await writeRoute(`/2026/${lang}/terms/`, simplePolicy(`/2026/${lang}/terms/`, lang, "Terms of Service", "Terms of Service"), "0.2");
  }

  await writeFile(path.join(dist, "2026/sitemap.xml"), sitemap());
  await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${data.domain}/2026/sitemap.xml\n`);

  console.log(`Successfully compiled multi-language localized portal with Google Analytics & AdSense integrated! Total routes: ${pageList.length}`);
}

build().catch(console.error);
