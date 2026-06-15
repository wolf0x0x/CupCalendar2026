import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const sitePath = path.join(dataDir, "site.json");
const matchesPath = path.join(dataDir, "matches.json");
const standingsPath = path.join(dataDir, "standings.json");
const lastSyncPath = path.join(dataDir, "last_sync.json");

const worldcup26Base = (process.env.WORLDCUP26_API_BASE || "https://worldcup26.ir").replace(/\/$/, "");
const footballDataUrl = process.env.FOOTBALL_DATA_MATCHES_URL || "https://api.football-data.org/v4/competitions/WC/matches";
const fifaReferenceUrl = process.env.FIFA_REFERENCE_URL || "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026";

const GROUPS = Array.from({ length: 12 }, (_, index) => `Group ${String.fromCharCode(65 + index)}`);

const nameAliases = new Map([
  ["Czech Republic", "Czechia"],
  ["Turkey", "Türkiye"],
  ["Turkiye", "Türkiye"],
  ["Cape Verde", "Cabo Verde"],
  ["Congo DR", "DR Congo"],
  ["Democratic Republic of the Congo", "DR Congo"],
  ["United States of America", "United States"],
  ["USA", "United States"]
]);

const normalizeTeamName = (value) => {
  const name = String(value || "").trim();
  if (!name || name === "undefined" || name === "null") return "TBD";
  return nameAliases.get(name) || name;
};

function unwrap(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.matches)) return payload.matches;
  return [];
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: "application/json",
      "user-agent": "CupCalendarBot/1.0",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function normalizeLocalDate(value) {
  const text = String(value || "").trim();
  const [month, day, yearAndTime] = text.split("/");
  const [year, time = "00:00"] = String(yearAndTime || "").trim().split(/\s+/);
  if (!month || !day || !year) return { date: "", time: "" };
  return {
    date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    time
  };
}

function normalizeGroup(value) {
  const group = String(value || "").trim();
  if (/^Group [A-L]$/.test(group)) return group;
  if (/^[A-L]$/.test(group)) return `Group ${group}`;
  return group || "";
}

function scoreLabel(homeScore, awayScore) {
  return Number.isFinite(homeScore) && Number.isFinite(awayScore) ? `${homeScore} - ${awayScore}` : "- : -";
}

function normalizeWorldcup26Game(game) {
  const { date, time } = normalizeLocalDate(game.local_date);
  const homeScore = game.home_score === "" || game.home_score == null ? null : Number(game.home_score);
  const awayScore = game.away_score === "" || game.away_score == null ? null : Number(game.away_score);
  const finished = String(game.finished).toUpperCase() === "TRUE";
  const home = normalizeTeamName(game.home_team_name_en);
  const away = normalizeTeamName(game.away_team_name_en);

  return {
    id: `${home.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tbd"}-${away.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tbd"}-${game.id ?? ""}`,
    sourceId: String(game.id ?? ""),
    type: game.type || "group",
    group: normalizeGroup(game.group),
    matchday: game.matchday ? `Matchday ${game.matchday}` : "",
    date,
    time,
    home,
    away,
    homeScore,
    awayScore,
    score: scoreLabel(homeScore, awayScore),
    status: finished ? "Final" : (game.time_elapsed || "Scheduled"),
    finished,
    stadiumId: String(game.stadium_id ?? ""),
    dataSource: "worldcup26.ir"
  };
}

function normalizeFootballDataMatch(match) {
  const utcDate = match.utcDate ? new Date(match.utcDate) : null;
  const status = String(match.status || "").toUpperCase();
  const homeScore = match.score?.fullTime?.home == null ? null : Number(match.score.fullTime.home);
  const awayScore = match.score?.fullTime?.away == null ? null : Number(match.score.fullTime.away);
  const home = normalizeTeamName(match.homeTeam?.name || match.homeTeam?.shortName);
  const away = normalizeTeamName(match.awayTeam?.name || match.awayTeam?.shortName);

  return {
    id: String(match.id ?? `${home}-${away}`),
    date: utcDate && Number.isFinite(utcDate.getTime()) ? utcDate.toISOString().slice(0, 10) : "",
    home,
    away,
    homeScore,
    awayScore,
    score: scoreLabel(homeScore, awayScore),
    status: status === "FINISHED" ? "Final" : (match.status || "Scheduled"),
    finished: status === "FINISHED",
    dataSource: "football-data.org"
  };
}

async function fetchWorldcup26() {
  const payload = await fetchJson(`${worldcup26Base}/get/games`);
  const games = unwrap(payload, "games").map(normalizeWorldcup26Game);
  return {
    ok: true,
    source: `${worldcup26Base}/get/games`,
    fetched: games.length,
    matches: games
  };
}

async function fetchFootballData() {
  if (!process.env.FOOTBALL_DATA_TOKEN) {
    return {
      ok: false,
      skipped: true,
      source: footballDataUrl,
      reason: "FOOTBALL_DATA_TOKEN is not configured"
    };
  }

  const payload = await fetchJson(footballDataUrl, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN }
  });
  const matches = unwrap(payload, "matches").map(normalizeFootballDataMatch);
  return {
    ok: true,
    source: footballDataUrl,
    fetched: matches.length,
    matches
  };
}

function conflictKey(match) {
  return `${match.home}::${match.away}`;
}

function validateAgainstSecondary(primaryMatches, secondaryMatches) {
  const secondaryByTeams = new Map(secondaryMatches.map((match) => [conflictKey(match), match]));
  const conflicts = [];

  for (const match of primaryMatches) {
    const other = secondaryByTeams.get(conflictKey(match));
    if (!other) continue;
    const issues = [];
    if (match.date && other.date && match.date !== other.date) issues.push(`date ${match.date} != ${other.date}`);
    if (match.finished && other.finished && match.score !== other.score) issues.push(`score ${match.score} != ${other.score}`);
    if (issues.length) {
      conflicts.push({
        match: `${match.home} vs ${match.away}`,
        primary: { source: "worldcup26.ir", date: match.date, score: match.score, status: match.status },
        secondary: { source: "football-data.org", date: other.date, score: other.score, status: other.status },
        issues
      });
    }
  }

  return conflicts;
}

function standingsFromMatches(matches, siteTeams = []) {
  const tables = new Map(GROUPS.map((group) => [group, new Map()]));

  for (const team of siteTeams) {
    const group = normalizeGroup(team.group);
    if (!tables.has(group)) continue;
    tables.get(group).set(team.name, {
      team: team.name,
      code: team.code || "",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    });
  }

  for (const match of matches) {
    if (!tables.has(match.group)) continue;
    const table = tables.get(match.group);
    for (const name of [match.home, match.away]) {
      if (!name || name === "TBD") continue;
      if (!table.has(name)) {
        table.set(name, {
          team: name,
          code: "",
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0
        });
      }
    }
  }

  for (const match of matches) {
    if (!tables.has(match.group) || !match.finished) continue;
    if (!Number.isFinite(match.homeScore) || !Number.isFinite(match.awayScore)) continue;
    if (match.home === "TBD" || match.away === "TBD") continue;

    const table = tables.get(match.group);
    const home = table.get(match.home);
    const away = table.get(match.away);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.gf += match.homeScore;
    home.ga += match.awayScore;
    away.gf += match.awayScore;
    away.ga += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return GROUPS.map((group) => ({
    group,
    rows: [...tables.get(group).values()]
      .map((row) => ({ ...row, gd: row.gf - row.ga }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
  }));
}

function teamPairKey(home, away) {
  return `${normalizeTeamName(home)}::${normalizeTeamName(away)}`;
}

function applyScoresToSite(site, matches, standings, syncedAt) {
  const direct = new Map(site.matches.map((match) => [teamPairKey(match.home, match.away), match]));
  const reversed = new Map(site.matches.map((match) => [teamPairKey(match.away, match.home), match]));
  let updatedMatches = 0;

  for (const liveMatch of matches) {
    if (liveMatch.home === "TBD" || liveMatch.away === "TBD") continue;

    const directMatch = direct.get(teamPairKey(liveMatch.home, liveMatch.away));
    const reverseMatch = reversed.get(teamPairKey(liveMatch.home, liveMatch.away));
    const siteMatch = directMatch || reverseMatch;
    if (!siteMatch) continue;

    const wasReverse = !directMatch && Boolean(reverseMatch);
    const homeScore = wasReverse ? liveMatch.awayScore : liveMatch.homeScore;
    const awayScore = wasReverse ? liveMatch.homeScore : liveMatch.awayScore;
    const nextScore = scoreLabel(homeScore, awayScore);
    const nextStatus = liveMatch.finished ? "Final" : liveMatch.status;
    const before = JSON.stringify({
      date: siteMatch.date,
      time: siteMatch.time,
      score: siteMatch.score,
      status: siteMatch.status,
      prediction: siteMatch.prediction,
      dataSource: siteMatch.dataSource
    });

    siteMatch.date = liveMatch.date || siteMatch.date;
    siteMatch.time = liveMatch.time || siteMatch.time;
    siteMatch.score = nextScore;
    siteMatch.status = nextStatus;
    siteMatch.prediction = nextStatus === "Final" ? "Final result" : (siteMatch.network ? `TV: ${siteMatch.network}` : "Kickoff scheduled");
    siteMatch.dataSource = "worldcup26.ir";

    const after = JSON.stringify({
      date: siteMatch.date,
      time: siteMatch.time,
      score: siteMatch.score,
      status: siteMatch.status,
      prediction: siteMatch.prediction,
      dataSource: siteMatch.dataSource
    });
    if (before !== after) updatedMatches += 1;
  }

  site.standings = standings;
  site.dataSource = {
    provider: "worldcup26.ir",
    apiBase: worldcup26Base,
    fetchedAt: syncedAt,
    mode: "scores-and-standings",
    note: "CupCalendar applies live match status, scores, and computed standings into data/site.json so the static site rebuild reflects current tournament data."
  };

  return updatedMatches;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJsonIfChanged(filePath, payload) {
  const next = stableJson(payload);
  const previous = await readFile(filePath, "utf8").catch(() => "");
  if (previous === next) return false;
  await writeFile(filePath, next);
  return true;
}

await mkdir(dataDir, { recursive: true });

const syncedAt = new Date().toISOString();
const site = await readJson(sitePath, { teams: [] });
const sources = [];
let primary = { ok: false, matches: [] };
let secondary = { ok: false, matches: [] };

try {
  primary = await fetchWorldcup26();
} catch (error) {
  primary = { ok: false, source: `${worldcup26Base}/get/games`, error: error.message, matches: [] };
}
const primaryFinished = primary.matches.filter((match) => match.finished || match.status === "Final");
const primaryFinishedGroups = [...new Set(primaryFinished.map((match) => match.group).filter(Boolean))].sort();
const primaryLatestFinishedDate = primaryFinished
  .map((match) => match.date)
  .filter(Boolean)
  .sort()
  .at(-1) || "";
sources.push({
  name: "worldcup26.ir",
  priority: 1,
  ok: primary.ok,
  source: primary.source,
  fetched: primary.fetched || 0,
  finishedMatches: primaryFinished.length,
  finishedGroups: primaryFinishedGroups,
  latestFinishedDate: primaryLatestFinishedDate,
  error: primary.error
});

try {
  secondary = await fetchFootballData();
} catch (error) {
  secondary = { ok: false, source: footballDataUrl, error: error.message, matches: [] };
}
sources.push({
  name: "football-data.org",
  priority: 2,
  ok: secondary.ok,
  skipped: secondary.skipped || false,
  source: secondary.source,
  fetched: secondary.fetched || 0,
  error: secondary.error,
  reason: secondary.reason
});
sources.push({
  name: "FIFA official site",
  priority: 3,
  ok: true,
  mode: "manual factual baseline",
  source: fifaReferenceUrl,
  note: "FIFA has no stable public JSON API configured for this static sync; use this source as the human verification baseline when conflicts are reported."
});

if (!primary.ok) {
  throw new Error(`Primary source unavailable: ${primary.error || "unknown error"}`);
}

const conflicts = secondary.ok ? validateAgainstSecondary(primary.matches, secondary.matches) : [];
const standings = standingsFromMatches(primary.matches, site.teams || []);
const siteUpdatedMatches = applyScoresToSite(site, primary.matches, standings, syncedAt);

const matchesPayload = {
  syncedAt,
  sourcePriority: ["worldcup26.ir/get/games", "football-data.org", "FIFA official site"],
  matches: primary.matches.map((match) => ({
    ...match,
    validation: conflicts.some((conflict) => conflict.match === `${match.home} vs ${match.away}`) ? "conflict" : "primary"
  }))
};

const standingsPayload = {
  syncedAt,
  source: "computed from data/matches.json",
  groups: standings
};

const lastSyncPayload = {
  checkedAt: syncedAt,
  syncedAt,
  timezone: "UTC",
  schedule: {
    requested: "Every 15 minutes",
    githubActionsCronUtc: "*/15 * * * *"
  },
  outputs: {
    matches: "data/matches.json",
    standings: "data/standings.json",
    site: "data/site.json",
    lastSync: "data/last_sync.json"
  },
  siteUpdate: {
    updatedMatches: siteUpdatedMatches,
    standingsGroups: standings.length,
    note: "data/site.json is updated because the static site build reads this file directly."
  },
  dataFreshness: {
    primaryFinishedMatches: primaryFinished.length,
    primaryFinishedGroups,
    primaryLatestFinishedDate,
    siteFinalMatches: site.matches.filter((match) => match.status === "Final").length,
    siteNonEmptyGroups: site.standings
      .filter((group) => group.rows.some((row) => row.played > 0))
      .map((group) => group.group)
  },
  sources,
  validation: {
    conflictCount: conflicts.length,
    conflicts
  }
};

const changed = {
  matches: await writeJsonIfChanged(matchesPath, matchesPayload),
  standings: await writeJsonIfChanged(standingsPath, standingsPayload),
  site: await writeJsonIfChanged(sitePath, site),
  lastSync: await writeJsonIfChanged(lastSyncPath, lastSyncPayload)
};

console.log(`Scores sync complete: ${primary.matches.length} matches, ${standings.length} groups, ${conflicts.length} validation conflicts.`);
console.log(`Changed files: ${Object.entries(changed).filter(([, value]) => value).map(([key]) => key).join(", ") || "none"}`);
