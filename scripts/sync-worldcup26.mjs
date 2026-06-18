import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const apiBase = (process.env.WORLDCUP26_API_BASE || "https://worldcup26.ir").replace(/\/$/, "");
const outDir = path.join(root, "data");
const snapshotPath = path.join(outDir, "api-snapshot.json");
const sitePath = path.join(outDir, "site.json");

const endpoints = {
  games: "/get/games",
  groups: "/get/groups",
  teams: "/get/teams",
  stadiums: "/get/stadiums"
};

async function fetchJson(name, route) {
  const response = await fetch(`${apiBase}${route}`, {
    headers: { accept: "application/json", "user-agent": "CupCalendarBot/1.0" }
  });
  if (!response.ok) throw new Error(`${name} failed: HTTP ${response.status}`);
  return response.json();
}

function unwrap(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeDate(value) {
  const [month, day, yearAndTime] = String(value || "").split("/");
  const [year, time = "00:00"] = String(yearAndTime || "").trim().split(/\s+/);
  if (!month || !day || !year) return { date: "", time: "" };
  return {
    date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    time
  };
}

function normalizeGame(game) {
  const { date, time } = normalizeDate(game.local_date);
  const homeScore = game.home_score ?? "";
  const awayScore = game.away_score ?? "";
  const finished = String(game.finished).toUpperCase() === "TRUE";
  const rawGroup = String(game.group || "").trim();
  const group = rawGroup.startsWith("Group ") ? rawGroup : (/^[A-L]$/.test(rawGroup) ? `Group ${rawGroup}` : rawGroup);
  return {
    sourceId: String(game.id ?? ""),
    group,
    matchday: game.matchday ? `Matchday ${game.matchday}` : "",
    date,
    time,
    home: game.home_team_name_en || "",
    away: game.away_team_name_en || "",
    score: homeScore !== "" && awayScore !== "" ? `${homeScore} - ${awayScore}` : "- : -",
    status: finished ? "Final" : (game.time_elapsed || "Scheduled"),
    stadiumId: String(game.stadium_id ?? ""),
    type: game.type || "group"
  };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

const nameAliases = new Map([
  ["Czech Republic", "Czechia"],
  ["Turkey", "Türkiye"],
  ["Turkiye", "Türkiye"],
  ["Cape Verde", "Cabo Verde"],
  ["Congo DR", "DR Congo"],
  ["Democratic Republic of the Congo", "DR Congo"],
  ["USA", "United States"]
]);

const normalizeTeamName = (name) => nameAliases.get(name) || name;

const venueAliases = new Map([
  ["GEHA Field at Arrowhead Stadium", "GEHA Field at Arrowhead Stadium"],
  ["Arrowhead Stadium", "GEHA Field at Arrowhead Stadium"],
  ["AT&T Stadium", "AT&T Stadium"],
  ["BMO Field", "BMO Field"],
  ["BC Place", "BC Place"],
  ["Estadio Akron", "Estadio Akron"],
  ["Estadio Azteca", "Estadio Azteca"],
  ["Estadio BBVA", "Estadio BBVA"],
  ["Gillette Stadium", "Gillette Stadium"],
  ["Hard Rock Stadium", "Hard Rock Stadium"],
  ["Levi's Stadium", "Levi's Stadium"],
  ["Lincoln Financial Field", "Lincoln Financial Field"],
  ["Lumen Field", "Lumen Field"],
  ["Mercedes-Benz Stadium", "Mercedes-Benz Stadium"],
  ["MetLife Stadium", "MetLife Stadium"],
  ["NRG Stadium", "NRG Stadium"],
  ["SoFi Stadium", "SoFi Stadium"]
]);

const cityTimezone = [
  [/Toronto|New York|Boston|Philadelphia|Atlanta|Miami/i, { zone: "America/New_York", offset: "UTC-4" }],
  [/Mexico City|Monterrey|Guadalajara|Dallas|Houston|Kansas City/i, { zone: "America/Chicago", offset: "UTC-5" }],
  [/Vancouver|Seattle|Los Angeles|San Francisco/i, { zone: "America/Los_Angeles", offset: "UTC-7" }]
];

function timezoneFor(city) {
  return cityTimezone.find(([pattern]) => pattern.test(city))?.[1] || { zone: "America/New_York", offset: "UTC-4" };
}

function syncKnownMatches(site, normalizedGames, stadiums) {
  const stadiumById = new Map(stadiums.map((stadium) => [String(stadium.id), stadium]));
  const matchByTeams = new Map(site.matches.map((match) => [`${match.home}::${match.away}`, match]));
  const matchByReversedTeams = new Map(site.matches.map((match) => [`${match.away}::${match.home}`, match]));

  for (const game of normalizedGames) {
    const home = normalizeTeamName(game.home);
    const away = normalizeTeamName(game.away);
    if (!home || !away || home === "undefined" || away === "undefined") continue;
    const directMatch = matchByTeams.get(`${home}::${away}`);
    const reverseMatch = matchByReversedTeams.get(`${home}::${away}`);
    const match = directMatch || reverseMatch;
    if (!match) continue;
    const reverseScore = !directMatch && Boolean(reverseMatch);

    const stadium = stadiumById.get(game.stadiumId);
    if (stadium) {
      const venue = venueAliases.get(stadium.name_en) || stadium.name_en;
      const city = String(stadium.city_en || "").replace(/\s*\(.+\)\s*/g, "");
      const tz = timezoneFor(city);
      match.venue = venue;
      match.city = city;
      match.timezone = tz.zone;
      match.timezoneLabel = tz.offset;
    }

    match.date = game.date || match.date;
    match.time = game.time || match.time;
    match.score = reverseScore && game.score.includes("-")
      ? game.score.split("-").map((part) => part.trim()).reverse().join(" - ")
      : (game.score || match.score);
    match.status = game.status || match.status;
    match.prediction = match.status === "Final" ? "Final result" : (match.network ? `TV: ${match.network}` : "Kickoff scheduled");
    match.dataSource = "worldcup26.ir";
  }

  for (const venue of site.venues) {
    venue.matches = site.matches.filter((match) => match.venue === venue.name).length;
  }
}

function standingsFromMatches(matches, siteTeams) {
  const teamByName = new Map(siteTeams.map((team) => [team.name, team]));
  const tables = new Map();

  for (const match of matches) {
    if (!/^Group [A-L]$/.test(match.group)) continue;
    if (!match.group) continue;
    if (!tables.has(match.group)) tables.set(match.group, new Map());
    const table = tables.get(match.group);
    for (const name of [match.home, match.away]) {
      if (!name) continue;
      const normalized = normalizeTeamName(name);
      if (!table.has(normalized)) table.set(normalized, { team: normalized, played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0, gf: 0, ga: 0 });
    }
  }

  for (const match of matches) {
    if (!/^Group [A-L]$/.test(match.group)) continue;
    if (match.status !== "Final" || !match.score.includes("-")) continue;
    const table = tables.get(match.group);
    if (!table) continue;
    const home = normalizeTeamName(match.home);
    const away = normalizeTeamName(match.away);
    const rowHome = table.get(home);
    const rowAway = table.get(away);
    if (!rowHome || !rowAway) continue;
    const [homeGoals, awayGoals] = match.score.split("-").map((part) => Number(part.trim()));
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;
    rowHome.played += 1; rowAway.played += 1;
    rowHome.gf += homeGoals; rowHome.ga += awayGoals;
    rowAway.gf += awayGoals; rowAway.ga += homeGoals;
    if (homeGoals > awayGoals) { rowHome.won += 1; rowAway.lost += 1; rowHome.points += 3; }
    else if (homeGoals < awayGoals) { rowAway.won += 1; rowHome.lost += 1; rowAway.points += 3; }
    else { rowHome.drawn += 1; rowAway.drawn += 1; rowHome.points += 1; rowAway.points += 1; }
  }

  for (const team of siteTeams) {
    const teamGroup = String(team.group || "").trim();
    const groupName = teamGroup.startsWith("Group ") ? teamGroup : `Group ${teamGroup}`;
    if (!tables.has(groupName)) tables.set(groupName, new Map());
    const table = tables.get(groupName);
    if (!table.has(team.name)) table.set(team.name, { team: team.name, played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0, gf: 0, ga: 0 });
  }

  return [...tables.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, rows]) => ({
      group,
      rows: [...rows.values()]
        .map((row) => ({ ...row, gd: row.gf - row.ga }))
        .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
    }));
}

let snapshot;
let usedCachedSnapshot = false;

try {
  const [gamesRaw, groupsRaw, teamsRaw, stadiumsRaw] = await Promise.all([
    fetchJson("games", endpoints.games),
    fetchJson("groups", endpoints.groups),
    fetchJson("teams", endpoints.teams),
    fetchJson("stadiums", endpoints.stadiums)
  ]);

  snapshot = {
    source: apiBase,
    fetchedAt: new Date().toISOString(),
    games: unwrap(gamesRaw, "games"),
    groups: unwrap(groupsRaw, "groups"),
    teams: unwrap(teamsRaw, "teams"),
    stadiums: unwrap(stadiumsRaw, "stadiums")
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
} catch (error) {
  snapshot = await readJson(snapshotPath, null);
  if (!snapshot?.games?.length) throw error;
  usedCachedSnapshot = true;
  console.warn(`Using cached worldcup26 snapshot from ${snapshot.fetchedAt}: ${error.message}`);
}

if (process.env.APPLY_WORLDCUP26 === "1" && !usedCachedSnapshot) {
  const site = JSON.parse(await readFile(sitePath, "utf8"));
  const normalizedGames = snapshot.games.map(normalizeGame);
  syncKnownMatches(site, normalizedGames, snapshot.stadiums);
  site.standings = standingsFromMatches(normalizedGames, site.teams);
  site.dataSource = {
    provider: "worldcup26.ir",
    apiBase,
    fetchedAt: snapshot.fetchedAt,
    mode: "scores-and-standings",
    note: "CupCalendar stores the upstream snapshot and updates static scores plus standings during build-time sync."
  };
  await writeFile(sitePath, `${JSON.stringify(site, null, 2)}\n`);
}

console.log(`${usedCachedSnapshot ? "Preserved" : "Synced"} worldcup26.ir snapshot: ${snapshot.games.length} games, ${snapshot.groups.length} groups, ${snapshot.teams.length} teams, ${snapshot.stadiums.length} stadiums.`);
