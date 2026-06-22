import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const root = process.cwd();
const dataDir = path.join(root, "data");
const sitePath = path.join(dataDir, "site.json");
const rawPath = path.join(dataDir, "news_raw.json");
const translatedPath = path.join(dataDir, "news_translated.json");
const newsPath = path.join(dataDir, "news.json");
const cachePath = path.join(dataDir, "translation_cache.json");
const queuePath = path.join(dataDir, "translation_queue.json");
const execFileAsync = promisify(execFile);

const targetLanguages = ["es", "pt", "fr", "de", "ja", "zh"];
const keywords = [
  "world cup 2026",
  "2026 world cup",
  "fifa world cup",
  "copa mundial",
  "coupe du monde",
  "weltmeisterschaft",
  "世界杯",
  "worldcup26"
];

const defaultFeeds = [
  { source: "FIFA", url: "https://inside.fifa.com/rss-feeds/news" },
  { source: "ESPN", url: "https://www.espn.com/espn/rss/soccer/news" },
  { source: "BBC", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { source: "The Guardian", url: "https://www.theguardian.com/football/rss" },
  { source: "FOX", url: "https://api.foxsports.com/v1/rss?tag=soccer" }
];

const officialFifaFallback = {
  source: "FIFA",
  tag: "Official",
  title: "FIFA official 2026 World Cup hub tracks fixtures, venues, and tournament updates",
  summary: "Use the official FIFA tournament hub as the editorial reference for schedule, venue, and competition updates.",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
  time: new Date().toISOString().slice(0, 10)
};

const fallbackNews = [
  officialFifaFallback,
  {
    source: "CupCalendar",
    tag: "Data",
    title: "CupCalendar keeps 2026 World Cup fixtures, standings, and venues in sync",
    summary: "The content pipeline updates static pages while preserving a safe fallback when external feeds are unavailable.",
    url: "https://cupcalendar.xyz/2026/",
    time: new Date().toISOString().slice(0, 10)
  }
];

const esc = (value) =>
  String(value ?? "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const hashText = (text) => createHash("md5").update(String(text)).digest("hex");

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function readCommittedJson(file, fallback) {
  try {
    const relPath = path.relative(root, file);
    const { stdout } = await execFileAsync("git", ["show", `HEAD:${relPath}`]);
    return JSON.parse(stdout);
  } catch {
    return fallback;
  }
}

function parseTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return esc(match?.[1] || "");
}

function parseItems(xml, source) {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const atomBlocks = blocks.length ? [] : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return [...blocks, ...atomBlocks].map((block) => {
    const title = parseTag(block, "title");
    const summary = parseTag(block, "description") || parseTag(block, "summary") || parseTag(block, "content");
    const link = parseTag(block, "link") || esc(block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "");
    const published = parseTag(block, "pubDate") || parseTag(block, "published") || parseTag(block, "updated");
    return {
      id: hashText(`${source}:${title}:${link}`),
      source,
      tag: source === "CupCalendar" ? "Update" : "RSS",
      title,
      summary,
      url: link,
      time: published ? new Date(published).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    };
  }).filter((item) => item.title);
}

function isRelevant(item) {
  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    try {
      const response = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          accept: "application/rss+xml, application/xml, text/xml, */*",
          "user-agent": "CupCalendarBot/1.0"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseItems(await response.text(), feed.source);
    } catch (error) {
      const { stdout } = await execFileAsync("curl", [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "20",
        "--header",
        "accept: application/rss+xml, application/xml, text/xml, */*",
        "--user-agent",
        "CupCalendarBot/1.0",
        feed.url
      ]);
      if (!stdout.trim()) throw error;
      return parseItems(stdout, feed.source);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function dedupe(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = hashText(item.title.toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...item, titleHash: key });
  }
  return output;
}

async function translateWithDeepL(text, targetLang) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      authorization: `DeepL-Auth-Key ${apiKey}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      text,
      target_lang: targetLang === "pt" ? "PT-BR" : targetLang.toUpperCase()
    })
  });
  if (!response.ok) throw new Error(`DeepL ${response.status}`);
  const payload = await response.json();
  return payload.translations?.[0]?.text || null;
}

async function translateText(text, lang, cache, queue, options = {}) {
  const key = hashText(text);
  const now = options.now || new Date().toISOString();
  cache[key] = cache[key] || { hash: key, source: text, translations: {}, last_used: now };
  if (options.touchCache !== false) {
    cache[key].last_used = now;
  }
  if (cache[key].translations?.[lang]) return cache[key].translations[lang];

  try {
    const translated = await translateWithDeepL(text, lang);
    if (translated) {
      cache[key].translations[lang] = translated;
      return translated;
    }
  } catch (error) {
    queue.push({ hash: key, lang, source: text, error: error.message, queued_at: now });
  }

  queue.push({ hash: key, lang, source: text, error: "translation_api_unavailable", queued_at: now });
  cache[key].translations[lang] = text;
  return text;
}

function pruneCache(cache) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return Object.fromEntries(Object.entries(cache).filter(([, entry]) => {
    return new Date(entry.last_used || 0).getTime() >= cutoff;
  }));
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  const feeds = process.env.RSS_SOURCES_JSON ? JSON.parse(process.env.RSS_SOURCES_JSON) : defaultFeeds;
  const previousRaw = await readJson(rawPath, null);
  const previousTranslated = await readJson(translatedPath, null);
  const previousSite = await readJson(sitePath, null);
  const previousQueue = await readJson(queuePath, []);
  const fetched = [];
  const errors = [];

  for (const feed of feeds) {
    try {
      fetched.push(...await fetchFeed(feed));
    } catch (error) {
      errors.push({ source: feed.source, url: feed.url, error: error.message });
    }
  }

  const filtered = dedupe(fetched.filter(isRelevant)).slice(0, 20);
  const committedRaw = fetched.length === 0 ? await readCommittedJson(rawPath, null) : null;
  const previousItems = previousRaw?.items?.length ? previousRaw.items : null;
  const committedItems = committedRaw?.items?.length ? committedRaw.items : null;
  const preservedItems = (fetched.length === 0 && committedItems && (!previousItems || committedItems.length > previousItems.length))
    ? committedItems
    : (previousItems || committedItems);
  const rawNews = filtered.length
    ? filtered
    : (preservedItems
      ? preservedItems
      : fallbackNews.map((item) => ({ ...item, id: hashText(item.title), titleHash: hashText(item.title.toLowerCase()) })));
  if (!rawNews.some((item) => item.source === "FIFA")) {
    rawNews.unshift({ ...officialFifaFallback, id: hashText(officialFifaFallback.title), titleHash: hashText(officialFifaFallback.title.toLowerCase()) });
  }
  rawNews.splice(20);
  const reusedPreservedNews = fetched.length === 0 && Boolean(preservedItems?.length);
  const rawSyncTimestamp = reusedPreservedNews
    ? (previousRaw?.fetchedAt || committedRaw?.fetchedAt || new Date().toISOString())
    : new Date().toISOString();
  const translatedSyncTimestamp = reusedPreservedNews
    ? (previousTranslated?.fetchedAt || rawSyncTimestamp)
    : rawSyncTimestamp;
  const siteSyncTimestamp = reusedPreservedNews
    ? (previousSite?.contentSync?.fetchedAt || translatedSyncTimestamp)
    : rawSyncTimestamp;
  await writeFile(rawPath, `${JSON.stringify({ fetchedAt: rawSyncTimestamp, errors, items: rawNews }, null, 2)}\n`);

  const cache = pruneCache(await readJson(cachePath, {}));
  const queue = [];
  const translated = [];
  const touchCache = !reusedPreservedNews;
  for (const item of rawNews) {
    const translations = {};
    for (const lang of targetLanguages) {
      translations[lang] = {
        title: await translateText(item.title, lang, cache, queue, { now: translatedSyncTimestamp, touchCache }),
        summary: item.summary ? await translateText(item.summary, lang, cache, queue, { now: translatedSyncTimestamp, touchCache }) : ""
      };
    }
    translated.push({ ...item, translations });
  }

  const committedQueue = fetched.length === 0 ? await readCommittedJson(queuePath, []) : [];
  const pendingQueue = !process.env.DEEPL_API_KEY && queue.length === 0
    ? ((previousQueue?.length ? previousQueue : committedQueue) || [])
    : queue;

  await writeFile(translatedPath, `${JSON.stringify({ fetchedAt: translatedSyncTimestamp, items: translated }, null, 2)}\n`);
  await writeFile(newsPath, `${JSON.stringify(translated, null, 2)}\n`);
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  await writeFile(queuePath, `${JSON.stringify(pendingQueue, null, 2)}\n`);

  const site = previousSite;
  if (site) {
    site.news = translated.slice(0, 10).map((item) => ({
      source: item.source,
      tag: item.tag,
      title: item.title,
      summary: item.summary,
      url: item.url,
      time: item.time,
      translations: item.translations
    }));
    site.contentSync = {
      provider: "rss+translation-cache",
      fetchedAt: siteSyncTimestamp,
      newsItems: translated.length,
      translationQueue: pendingQueue.length,
      errors
    };
    await writeFile(sitePath, `${JSON.stringify(site, null, 2)}\n`);
  }

  console.log(`Content+i18n sync complete: ${rawNews.length} news items, ${pendingQueue.length} queued translations, ${errors.length} feed errors.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
