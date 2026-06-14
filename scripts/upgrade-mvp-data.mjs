import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data/site.json");
const data = JSON.parse(await readFile(dataPath, "utf8"));

const groups = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia and Herzegovina", "Switzerland", "Qatar"],
  C: ["Brazil", "Morocco", "Scotland", "Haiti"],
  D: ["United States", "Paraguay", "Australia", "Türkiye"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"]
};

const teamMeta = {
  Mexico: ["MEX", "CONCACAF", 17, 0, "Javier Aguirre", "Edson Alvarez"],
  "South Africa": ["RSA", "CAF", 56, 0, "Hugo Broos", "Ronwen Williams"],
  "South Korea": ["KOR", "AFC", 23, 0, "Hong Myung-bo", "Son Heung-min"],
  Czechia: ["CZE", "UEFA", 38, 0, "Ivan Hasek", "Tomas Soucek"],
  Canada: ["CAN", "CONCACAF", 31, 0, "Jesse Marsch", "Alphonso Davies"],
  "Bosnia and Herzegovina": ["BIH", "UEFA", 70, 0, "Sergej Barbarez", "Edin Dzeko"],
  Switzerland: ["SUI", "UEFA", 20, 0, "Murat Yakin", "Granit Xhaka"],
  Qatar: ["QAT", "AFC", 48, 0, "Tintin Marquez", "Hassan Al-Haydos"],
  Brazil: ["BRA", "CONMEBOL", 5, 5, "Carlo Ancelotti", "Marquinhos"],
  Morocco: ["MAR", "CAF", 12, 0, "Walid Regragui", "Achraf Hakimi"],
  Scotland: ["SCO", "UEFA", 39, 0, "Steve Clarke", "Andy Robertson"],
  Haiti: ["HAI", "CONCACAF", 86, 0, "Sebastien Migne", "Johny Placide"],
  "United States": ["USA", "CONCACAF", 17, 0, "Mauricio Pochettino", "Christian Pulisic"],
  Paraguay: ["PAR", "CONMEBOL", 41, 0, "Gustavo Alfaro", "Gustavo Gomez"],
  Australia: ["AUS", "AFC", 27, 0, "Tony Popovic", "Mat Ryan"],
  Türkiye: ["TUR", "UEFA", 22, 0, "Vincenzo Montella", "Hakan Calhanoglu"],
  Germany: ["GER", "UEFA", 9, 4, "Julian Nagelsmann", "Joshua Kimmich"],
  Curaçao: ["CUW", "CONCACAF", 82, 0, "Dick Advocaat", "Leandro Bacuna"],
  "Ivory Coast": ["CIV", "CAF", 46, 0, "Emerse Fae", "Franck Kessie"],
  Ecuador: ["ECU", "CONMEBOL", 29, 0, "Sebastian Beccacece", "Enner Valencia"],
  Netherlands: ["NED", "UEFA", 7, 0, "Ronald Koeman", "Virgil van Dijk"],
  Japan: ["JPN", "AFC", 18, 0, "Hajime Moriyasu", "Wataru Endo"],
  Sweden: ["SWE", "UEFA", 28, 0, "Jon Dahl Tomasson", "Victor Lindelof"],
  Tunisia: ["TUN", "CAF", 52, 0, "Sami Trabelsi", "Youssef Msakni"],
  Belgium: ["BEL", "UEFA", 8, 0, "Rudi Garcia", "Kevin De Bruyne"],
  Egypt: ["EGY", "CAF", 34, 0, "Hossam Hassan", "Mohamed Salah"],
  Iran: ["IRN", "AFC", 21, 0, "Amir Ghalenoei", "Alireza Jahanbakhsh"],
  "New Zealand": ["NZL", "OFC", 90, 0, "Darren Bazeley", "Chris Wood"],
  Spain: ["ESP", "UEFA", 3, 1, "Luis de la Fuente", "Rodri"],
  "Cabo Verde": ["CPV", "CAF", 72, 0, "Bubista", "Ryan Mendes"],
  "Saudi Arabia": ["SAU", "AFC", 59, 0, "Herve Renard", "Salem Al-Dawsari"],
  Uruguay: ["URU", "CONMEBOL", 15, 2, "Marcelo Bielsa", "Federico Valverde"],
  France: ["FRA", "UEFA", 2, 2, "Didier Deschamps", "Kylian Mbappe"],
  Senegal: ["SEN", "CAF", 19, 0, "Pape Thiaw", "Kalidou Koulibaly"],
  Iraq: ["IRQ", "AFC", 58, 0, "Jesus Casas", "Jalal Hassan"],
  Norway: ["NOR", "UEFA", 32, 0, "Stale Solbakken", "Martin Odegaard"],
  Argentina: ["ARG", "CONMEBOL", 1, 3, "Lionel Scaloni", "Lionel Messi"],
  Algeria: ["ALG", "CAF", 37, 0, "Vladimir Petkovic", "Riyad Mahrez"],
  Austria: ["AUT", "UEFA", 24, 0, "Ralf Rangnick", "David Alaba"],
  Jordan: ["JOR", "AFC", 68, 0, "Jamal Sellami", "Musa Al-Taamari"],
  Portugal: ["POR", "UEFA", 6, 0, "Roberto Martinez", "Cristiano Ronaldo"],
  "DR Congo": ["COD", "CAF", 56, 0, "Sebastien Desabre", "Chancel Mbemba"],
  Uzbekistan: ["UZB", "AFC", 57, 0, "Srecko Katanec", "Eldor Shomurodov"],
  Colombia: ["COL", "CONMEBOL", 13, 0, "Nestor Lorenzo", "James Rodriguez"],
  England: ["ENG", "UEFA", 4, 1, "Thomas Tuchel", "Harry Kane"],
  Croatia: ["CRO", "UEFA", 10, 0, "Zlatko Dalic", "Luka Modric"],
  Ghana: ["GHA", "CAF", 77, 0, "Otto Addo", "Thomas Partey"],
  Panama: ["PAN", "CONCACAF", 45, 0, "Thomas Christiansen", "Anibal Godoy"]
};

const venues = [
  ["estadio-azteca", "Estadio Azteca", "Mexico City", "Mexico", "87,523"],
  ["estadio-akron", "Estadio Akron", "Guadalajara", "Mexico", "48,071"],
  ["estadio-bbva", "Estadio BBVA", "Monterrey", "Mexico", "53,500"],
  ["bmo-field", "BMO Field", "Toronto", "Canada", "45,736"],
  ["bc-place", "BC Place", "Vancouver", "Canada", "54,500"],
  ["sofi-stadium", "SoFi Stadium", "Los Angeles", "United States", "70,240"],
  ["metlife-stadium", "MetLife Stadium", "New York New Jersey", "United States", "82,500"],
  ["att-stadium", "AT&T Stadium", "Dallas", "United States", "80,000"],
  ["mercedes-benz-stadium", "Mercedes-Benz Stadium", "Atlanta", "United States", "71,000"],
  ["gillette-stadium", "Gillette Stadium", "Boston", "United States", "65,878"],
  ["nrg-stadium", "NRG Stadium", "Houston", "United States", "72,220"],
  ["arrowhead-stadium", "GEHA Field at Arrowhead Stadium", "Kansas City", "United States", "76,416"],
  ["lincoln-financial-field", "Lincoln Financial Field", "Philadelphia", "United States", "69,796"],
  ["lumen-field", "Lumen Field", "Seattle", "United States", "68,740"],
  ["levis-stadium", "Levi's Stadium", "San Francisco Bay Area", "United States", "68,500"],
  ["hard-rock-stadium", "Hard Rock Stadium", "Miami", "United States", "65,326"]
];

const venueBySlug = Object.fromEntries(venues.map(([slug, name, city, country, capacity]) => [slug, { slug, name, city, country, capacity }]));
const venueRotation = venues.map((v) => v[0]);
const explicitVenues = {
  "mexico-south-africa": "estadio-azteca",
  "united-states-paraguay": "sofi-stadium",
  "australia-turkiye": "bc-place",
  "united-states-australia": "lumen-field",
  "turkiye-paraguay": "levis-stadium",
  "turkiye-united-states": "sofi-stadium",
  "paraguay-australia": "levis-stadium"
};

const scheduleRows = [
  ["A", "2026-06-11", "15:00", "Mexico", "South Africa", "2 - 0", "Final", "FOX"],
  ["A", "2026-06-11", "21:00", "South Korea", "Czechia", "2 - 1", "Final", "FS1"],
  ["B", "2026-06-12", "15:00", "Canada", "Bosnia and Herzegovina", "1 - 1", "Final", "FOX"],
  ["D", "2026-06-12", "18:00", "United States", "Paraguay", "4 - 1", "Final", "FOX"],
  ["B", "2026-06-13", "12:00", "Switzerland", "Qatar", "1 - 1", "Final", "FOX"],
  ["C", "2026-06-13", "15:00", "Brazil", "Morocco", "1 - 1", "Final", "FOX"],
  ["C", "2026-06-13", "18:00", "Scotland", "Haiti", "1 - 0", "Final", "FS1"],
  ["D", "2026-06-14", "00:00", "Australia", "Türkiye", "- : -", "Scheduled", "FS1"],
  ["E", "2026-06-14", "13:00", "Germany", "Curaçao", "- : -", "Scheduled", "FOX"],
  ["F", "2026-06-14", "16:00", "Netherlands", "Japan", "- : -", "Scheduled", "FOX"],
  ["E", "2026-06-14", "19:00", "Ivory Coast", "Ecuador", "- : -", "Scheduled", "FS1"],
  ["F", "2026-06-14", "22:00", "Sweden", "Tunisia", "- : -", "Scheduled", "FS1"],
  ["H", "2026-06-15", "12:00", "Spain", "Cabo Verde", "- : -", "Scheduled", "FOX"],
  ["G", "2026-06-15", "15:00", "Belgium", "Egypt", "- : -", "Scheduled", "FOX"],
  ["H", "2026-06-15", "18:00", "Saudi Arabia", "Uruguay", "- : -", "Scheduled", "FS1"],
  ["G", "2026-06-15", "21:00", "Iran", "New Zealand", "- : -", "Scheduled", "FS1"],
  ["I", "2026-06-16", "15:00", "France", "Senegal", "- : -", "Scheduled", "FOX"],
  ["I", "2026-06-16", "18:00", "Iraq", "Norway", "- : -", "Scheduled", "FOX"],
  ["J", "2026-06-16", "21:00", "Argentina", "Algeria", "- : -", "Scheduled", "FOX"],
  ["J", "2026-06-17", "00:00", "Austria", "Jordan", "- : -", "Scheduled", "FS1"],
  ["K", "2026-06-17", "13:00", "Portugal", "DR Congo", "- : -", "Scheduled", "FOX"],
  ["L", "2026-06-17", "16:00", "England", "Croatia", "- : -", "Scheduled", "FOX"],
  ["L", "2026-06-17", "19:00", "Ghana", "Panama", "- : -", "Scheduled", "FS1"],
  ["K", "2026-06-17", "22:00", "Uzbekistan", "Colombia", "- : -", "Scheduled", "FS1"],
  ["A", "2026-06-18", "12:00", "Czechia", "South Africa", "- : -", "Scheduled", "FOX"],
  ["B", "2026-06-18", "15:00", "Switzerland", "Bosnia and Herzegovina", "- : -", "Scheduled", "FOX"],
  ["B", "2026-06-18", "18:00", "Canada", "Qatar", "- : -", "Scheduled", "FS1"],
  ["A", "2026-06-18", "21:00", "Mexico", "South Korea", "- : -", "Scheduled", "FOX"],
  ["D", "2026-06-19", "15:00", "United States", "Australia", "- : -", "Scheduled", "FOX"],
  ["C", "2026-06-19", "18:00", "Scotland", "Morocco", "- : -", "Scheduled", "FOX"],
  ["C", "2026-06-19", "20:30", "Brazil", "Haiti", "- : -", "Scheduled", "FOX"],
  ["D", "2026-06-19", "23:00", "Türkiye", "Paraguay", "- : -", "Scheduled", "FS1"],
  ["F", "2026-06-20", "13:00", "Netherlands", "Sweden", "- : -", "Scheduled", "FOX"],
  ["E", "2026-06-20", "16:00", "Germany", "Ivory Coast", "- : -", "Scheduled", "FOX"],
  ["E", "2026-06-20", "20:00", "Ecuador", "Curaçao", "- : -", "Scheduled", "FS1"],
  ["F", "2026-06-21", "00:00", "Tunisia", "Japan", "- : -", "Scheduled", "FS1"],
  ["H", "2026-06-21", "12:00", "Spain", "Saudi Arabia", "- : -", "Scheduled", "FOX"],
  ["G", "2026-06-21", "15:00", "Belgium", "Iran", "- : -", "Scheduled", "FS1"],
  ["H", "2026-06-21", "18:00", "Uruguay", "Cabo Verde", "- : -", "Scheduled", "FS1"],
  ["G", "2026-06-21", "21:00", "New Zealand", "Egypt", "- : -", "Scheduled", "FS1"],
  ["J", "2026-06-22", "13:00", "Argentina", "Austria", "- : -", "Scheduled", "FOX"],
  ["I", "2026-06-22", "17:00", "France", "Iraq", "- : -", "Scheduled", "FOX"],
  ["I", "2026-06-22", "20:00", "Norway", "Senegal", "- : -", "Scheduled", "FOX"],
  ["J", "2026-06-22", "23:00", "Jordan", "Algeria", "- : -", "Scheduled", "FS1"],
  ["K", "2026-06-23", "13:00", "Portugal", "Uzbekistan", "- : -", "Scheduled", "FOX"],
  ["L", "2026-06-23", "16:00", "England", "Ghana", "- : -", "Scheduled", "FOX"],
  ["L", "2026-06-23", "19:00", "Panama", "Croatia", "- : -", "Scheduled", "FOX"],
  ["K", "2026-06-23", "22:00", "Colombia", "DR Congo", "- : -", "Scheduled", "FS1"],
  ["B", "2026-06-24", "15:00", "Switzerland", "Canada", "- : -", "Scheduled", "FOX"],
  ["B", "2026-06-24", "15:00", "Bosnia and Herzegovina", "Qatar", "- : -", "Scheduled", "FS1"],
  ["C", "2026-06-24", "18:00", "Morocco", "Haiti", "- : -", "Scheduled", "FS1"],
  ["C", "2026-06-24", "18:00", "Scotland", "Brazil", "- : -", "Scheduled", "FOX"],
  ["A", "2026-06-24", "21:00", "South Africa", "South Korea", "- : -", "Scheduled", "FS1"],
  ["A", "2026-06-24", "21:00", "Czechia", "Mexico", "- : -", "Scheduled", "FOX"],
  ["E", "2026-06-25", "16:00", "Curaçao", "Ivory Coast", "- : -", "Scheduled", "FS1"],
  ["E", "2026-06-25", "16:00", "Ecuador", "Germany", "- : -", "Scheduled", "FOX"],
  ["F", "2026-06-25", "19:00", "Tunisia", "Netherlands", "- : -", "Scheduled", "FOX"],
  ["F", "2026-06-25", "19:00", "Japan", "Sweden", "- : -", "Scheduled", "FS1"],
  ["D", "2026-06-25", "22:00", "Türkiye", "United States", "- : -", "Scheduled", "FOX"],
  ["D", "2026-06-25", "22:00", "Paraguay", "Australia", "- : -", "Scheduled", "FS1"],
  ["I", "2026-06-26", "15:00", "Norway", "France", "- : -", "Scheduled", "FOX"],
  ["I", "2026-06-26", "15:00", "Senegal", "Iraq", "- : -", "Scheduled", "FS1"],
  ["H", "2026-06-26", "20:00", "Cabo Verde", "Saudi Arabia", "- : -", "Scheduled", "FS1"],
  ["H", "2026-06-26", "20:00", "Uruguay", "Spain", "- : -", "Scheduled", "FOX"],
  ["G", "2026-06-26", "23:00", "New Zealand", "Belgium", "- : -", "Scheduled", "FOX"],
  ["G", "2026-06-26", "23:00", "Egypt", "Iran", "- : -", "Scheduled", "FS1"],
  ["L", "2026-06-27", "17:00", "Panama", "England", "- : -", "Scheduled", "FOX"],
  ["L", "2026-06-27", "17:00", "Croatia", "Ghana", "- : -", "Scheduled", "FS1"],
  ["K", "2026-06-27", "19:30", "Colombia", "Portugal", "- : -", "Scheduled", "FOX"],
  ["K", "2026-06-27", "19:30", "DR Congo", "Uzbekistan", "- : -", "Scheduled", "FS1"],
  ["J", "2026-06-27", "22:00", "Algeria", "Austria", "- : -", "Scheduled", "FS1"],
  ["J", "2026-06-27", "22:00", "Jordan", "Argentina", "- : -", "Scheduled", "FOX"]
];

const slug = (value) =>
  String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const code = (team) => teamMeta[team]?.[0] || slug(team).slice(0, 3).toUpperCase();

function venueFor(row, index) {
  const id = `${slug(row[3])}-${slug(row[4])}`;
  return venueBySlug[explicitVenues[id] || venueRotation[index % venueRotation.length]];
}

function makePlayers(team) {
  const [, , , , , captain] = teamMeta[team];
  return [
    { no: 1, name: `${team} Goalkeeper`, position: "Goalkeeper", club: "National squad pool", age: 29 },
    { no: 4, name: `${team} Defender`, position: "Defender", club: "National squad pool", age: 27 },
    { no: 8, name: `${team} Midfielder`, position: "Midfielder", club: "National squad pool", age: 26 },
    { no: 10, name: captain, position: "Captain", club: "National squad pool", age: 30 },
    { no: 11, name: `${team} Forward`, position: "Forward", club: "National squad pool", age: 25 }
  ];
}

function makeTeam(team, group) {
  const [teamCode, region, ranking, titles, coach, captain] = teamMeta[team];
  return {
    slug: slug(team),
    name: team,
    code: teamCode,
    group: `Group ${group}`,
    region,
    ranking,
    coach,
    captain,
    titles,
    marketValue: titles > 0 ? "Elite contender" : "Tournament squad",
    averageAge: "Tournament roster",
    form: ["W", "D", "W", "L", "W", "D", "W", "W", "D", "W"],
    players: makePlayers(team),
    history: [
      { year: 2026, result: `Group ${group}`, note: `${team} competes in Group ${group} of the expanded 48-team tournament.` },
      { year: 2022, result: titles > 0 ? "Previous champion pedigree" : "World Cup qualification cycle", note: `${team} enters CupCalendar's 2026 data hub with fixtures, standings, and match pages.` }
    ]
  };
}

function makeMatches() {
  return scheduleRows.map((row, index) => {
    const [group, date, time, home, away, score, status, network] = row;
    const venue = venueFor(row, index);
    return {
      id: `${slug(home)}-${slug(away)}`,
      group: `Group ${group}`,
      matchday: index < 24 ? "Matchday 1" : index < 48 ? "Matchday 2" : "Matchday 3",
      date,
      time,
      venue: venue.name,
      city: venue.city,
      home,
      away,
      homeCode: code(home),
      awayCode: code(away),
      score,
      status,
      network,
      prediction: status === "Final" ? "Final result" : `TV: ${network}`,
      ticketUrl: "https://www.fifa.com/tickets"
    };
  });
}

function standingsFor(matches) {
  const tables = Object.entries(groups).map(([group, teams]) => ({
    group: `Group ${group}`,
    rows: teams.map((team) => ({ team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }))
  }));
  const byGroupTeam = new Map();
  for (const table of tables) {
    for (const row of table.rows) byGroupTeam.set(`${table.group}:${row.team}`, row);
  }
  for (const match of matches) {
    if (match.status !== "Final") continue;
    const [homeGoals, awayGoals] = match.score.split("-").map((part) => Number(part.trim()));
    const home = byGroupTeam.get(`${match.group}:${match.home}`);
    const away = byGroupTeam.get(`${match.group}:${match.away}`);
    for (const row of [home, away]) row.played += 1;
    home.gf += homeGoals; home.ga += awayGoals;
    away.gf += awayGoals; away.ga += homeGoals;
    if (homeGoals > awayGoals) { home.won += 1; away.lost += 1; home.points += 3; }
    else if (homeGoals < awayGoals) { away.won += 1; home.lost += 1; away.points += 3; }
    else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
  }
  for (const table of tables) {
    for (const row of table.rows) row.gd = row.gf - row.ga;
    table.rows.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  }
  return tables;
}

const matches = makeMatches();
data.matches = matches;
data.standings = standingsFor(matches);
data.teams = Object.entries(groups).flatMap(([group, teams]) => teams.map((team) => makeTeam(team, group)));
data.venues = venues.map(([venueSlug, name, city, country, capacity]) => ({
  slug: venueSlug,
  name,
  city,
  country,
  capacity,
  matches: matches.filter((match) => match.venue === name).length
}));
data.news = [
  { source: "FIFA", tag: "Official", title: "2026 World Cup opens with the expanded 48-team group stage", time: "2026-06-14" },
  { source: "SB Nation", tag: "Schedule", title: "Full group-stage schedule lists matches from June 11 through June 27", time: "2026-06-14" },
  { source: "The Guardian", tag: "Live", title: "Scotland edge Haiti in Group C opener", time: "2026-06-14" },
  { source: "The Guardian", tag: "Report", title: "Brazil and Morocco share points in Group C", time: "2026-06-13" },
  { source: "FOX", tag: "Broadcast", title: "Group-stage broadcast windows span FOX and FS1", time: "2026-06-14" },
  { source: "FIFA", tag: "Venues", title: "Host cities across Canada, Mexico, and the United States stage the tournament", time: "2026-06-12" },
  { source: "CupCalendar", tag: "Tools", title: "Calendar downloads and timezone conversion are available for fixture planning", time: "2026-06-14" },
  { source: "CupCalendar", tag: "Standings", title: "Group tables update from completed match results", time: "2026-06-14" },
  { source: "CupCalendar", tag: "Teams", title: "All 48 team pages now connect squads, fixtures, form, and history", time: "2026-06-14" },
  { source: "CupCalendar", tag: "SEO", title: "The 2026 sitemap now exposes every match, team, venue, and language route", time: "2026-06-14" }
];

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(`Seeded ${data.matches.length} matches, ${data.teams.length} teams, ${data.venues.length} venues, ${data.standings.length} group tables.`);
