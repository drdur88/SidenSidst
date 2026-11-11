import { COPENHAGEN_SNAPSHOT, COPENHAGEN_SNAPSHOT_VERIFIED_AT } from "./news-curated";
import type { NewsArticle, NewsResponse, NewsScope, NewsSource, RegionId, TopicId } from "./news-types";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_PER_SOURCE = 20;
const MAX_ARTICLES = 180;
const CACHE_TTL_MS = 10 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 60 * 1000;
const TIMEOUT_MS = 12000;
const MAX_CONCURRENT_FETCHES = 5;

export interface NewsFeedSource {
  id: string;
  name: string;
  url: string;
  format: "rss" | "copenhagen-html";
  hosts: readonly string[];
  region: RegionId;
  scope: NewsScope;
  topics: readonly TopicId[];
  primary?: boolean;
}

// The API never accepts a visitor-supplied feed URL. Source photographs and full
// article bodies are not imported. Feed attribution remains next to each link.
// BBC's personal-site RSS terms: https://www.bbc.co.uk/usingthebbc/terms-of-use/
// Business reuse needs separate permission; this beta has no paid news access.
// Odense's official directory: https://www.odense.dk/presse/rss-feed
export const NEWS_FEED_SOURCES: readonly NewsFeedSource[] = [
  { id: "kk", name: "Københavns Kommune", url: "https://www.kk.dk/nyheder", format: "copenhagen-html", hosts: ["www.kk.dk", "kk.dk"], region: "koebenhavn", scope: "local", topics: ["samfund"], primary: true },
  { id: "odense", name: "Odense Kommune", url: "https://www.odense.dk/feed", format: "rss", hosts: ["www.odense.dk", "odense.dk"], region: "odense", scope: "local", topics: ["samfund"], primary: true },
  { id: "dr-indland", name: "DR Indland", url: "https://www.dr.dk/nyheder/service/feeds/indland", format: "rss", hosts: ["www.dr.dk", "dr.dk"], region: "danmark", scope: "national", topics: ["samfund"] },
  { id: "bbc-world", name: "BBC News · Verden", url: "https://feeds.bbci.co.uk/news/world/rss.xml", format: "rss", hosts: ["www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"], region: "verden", scope: "global", topics: ["samfund"] },
  { id: "bbc-europe", name: "BBC News · Europa", url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", format: "rss", hosts: ["www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"], region: "europa", scope: "global", topics: ["samfund"] },
  { id: "bbc-business", name: "BBC News · Økonomi", url: "https://feeds.bbci.co.uk/news/business/rss.xml", format: "rss", hosts: ["www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"], region: "verden", scope: "global", topics: ["erhverv"] },
  { id: "bbc-technology", name: "BBC News · Teknologi", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", format: "rss", hosts: ["www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"], region: "verden", scope: "global", topics: ["teknologi"] },
  { id: "bbc-science", name: "BBC News · Videnskab", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", format: "rss", hosts: ["www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"], region: "verden", scope: "global", topics: ["videnskab"] },
  { id: "bbc-culture", name: "BBC News · Kultur", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", format: "rss", hosts: ["www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"], region: "verden", scope: "global", topics: ["kultur"] },
];

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…",
  aelig: "æ", AElig: "Æ", oslash: "ø", Oslash: "Ø", aring: "å", Aring: "Å",
  eacute: "é", Eacute: "É", uuml: "ü", ouml: "ö", auml: "ä", copy: "©",
};

export function decodeNewsEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (!entity.startsWith("#")) return ENTITIES[entity] ?? match;
    const hex = entity.slice(0, 2).toLowerCase() === "#x";
    const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "";
  });
}

export function newsText(value: string, limit: number): string {
  // Decode before stripping as well, so encoded markup cannot escape as HTML.
  let text = decodeNewsEntities(decodeNewsEntities(value));
  text = text.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

export function newsUrl(value: string, source: NewsFeedSource): string | null {
  const raw = decodeNewsEntities(value).trim();
  if (!raw || raw.length > 3000 || /[\u0000-\u0020\u007f<>"`]/.test(raw)) return null;
  try {
    const url = new URL(raw, source.url);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !source.hosts.includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

interface XmlNode { name: string; children: XmlNode[]; parts: (string | XmlNode)[] }

// Bounded RSS-only XML reader. It understands CDATA, comments, namespaces and
// quoted attributes, verifies nesting, and deliberately rejects DTD/entity
// declarations. No external resources or entities can be resolved.
function readXml(input: string): XmlNode {
  const xml = input.replace(/^\uFEFF/, "");
  if (xml.length > MAX_BYTES || /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error("Invalid feed");
  const document: XmlNode = { name: "#document", children: [], parts: [] };
  const stack = [document];
  const tokens = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w.:-]*)(?:\s+[A-Za-z_:][\w.:-]*\s*=\s*(?:"[^"]*"|'[^']*'))*\s*(\/?)>|([^<]+)/g;
  let end = 0, count = 0;
  for (const token of xml.matchAll(tokens)) {
    if (token.index !== end || ++count > 80000) throw new Error("Invalid feed");
    end += token[0].length;
    if (token[1] !== undefined) { stack[stack.length - 1].parts.push(token[1]); continue; }
    if (token[5] !== undefined) { stack[stack.length - 1].parts.push(token[5]); continue; }
    if (!token[3]) continue;
    if (token[2]) {
      if (token[4] || stack.length === 1 || stack[stack.length - 1].name !== token[3] || !/^<\/[\w.:-]+\s*>$/.test(token[0])) throw new Error("Invalid feed");
      stack.pop();
    } else {
      const node: XmlNode = { name: token[3], children: [], parts: [] };
      stack[stack.length - 1].children.push(node);
      stack[stack.length - 1].parts.push(node);
      if (!token[4]) stack.push(node);
      if (stack.length > 40) throw new Error("Invalid feed");
    }
  }
  if (end !== xml.length || stack.length !== 1 || document.children.length !== 1 || document.parts.some((part) => typeof part === "string" && part.trim())) throw new Error("Invalid feed");
  return document.children[0];
}

const field = (node: XmlNode, name: string): string => {
  const child = node.children.find((item) => item.name === name);
  if (!child) return "";
  const content = (item: XmlNode): string => item.parts.map((part) => typeof part === "string" ? part : content(part)).join("");
  return content(child);
};

function publicationDate(value: string, now: number): string | null {
  // Missing dates never become "now". A small clock skew is tolerated, but
  // future-dated or malformed items cannot dominate the reader's feed.
  if (!value || value.length > 120 || !/(?:\d{4}-\d{2}-\d{2}|\b\d{4}\b)/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= Date.UTC(2000, 0, 1) && time <= now + 15 * 60 * 1000 ? new Date(time).toISOString() : null;
}

function articleId(url: string): string {
  // Two independent 32-bit hashes keep IDs short and stable across source feeds.
  let first = 2166136261, second = 5381;
  for (let i = 0; i < url.length; i++) {
    first = Math.imul(first ^ url.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ url.charCodeAt(i);
  }
  return `news-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

function canonicalKey(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|at_)/i.test(key)) url.searchParams.delete(key);
  return url.href;
}

function article(source: NewsFeedSource, title: string, description: string, link: string, date: string, now: number): NewsArticle | null {
  const safeTitle = newsText(title, 500), url = newsUrl(link, source), publishedAt = publicationDate(date, now);
  if (!safeTitle || !url || !publishedAt) return null;
  const safeDescription = newsText(description, 180);
  const text = `${safeTitle} ${safeDescription}`.toLocaleLowerCase("da");
  const topics = new Set<TopicId>(source.topics);
  if (/\b(climate|emissions?|renewable|warming|biodiversity|environment|klima\w*|genanvend\w*)\b/.test(text) || text.includes("miljø")) topics.add("klima");
  if (source.primary && /\b(kultur\w*|bibliotek\w*|kunst\w*|musik\w*|teater\w*)\b/.test(text)) topics.add("kultur");
  if (source.primary && /\b(erhverv\w*|arbejdsmarked\w*|ledighed\w*|virksomhed\w*)\b/.test(text)) topics.add("erhverv");
  return {
    id: articleId(canonicalKey(url)), title: safeTitle, description: safeDescription, url,
    sourceId: source.id, sourceName: source.name, publishedAt,
    topics: [...topics], region: source.region, scope: source.scope,
    imageKey: topics.has("klima") ? "climate" : /\b(transport|traffic|train|bus|trafik\w*|metro\w*)\b/.test(text) ? "mobility" : "city",
  };
}

export function parseNewsRss(xml: string, source: NewsFeedSource, now = Date.now()): NewsArticle[] {
  const root = readXml(xml);
  const channel = root.children.find((node) => node.name === "channel");
  if (root.name !== "rss" || !channel) throw new Error("Not an RSS feed");
  const results: NewsArticle[] = [];
  for (const item of channel.children.filter((node) => node.name === "item")) {
    const parsed = article(source, field(item, "title"), field(item, "description"), field(item, "link"), field(item, "pubDate"), now);
    if (parsed) results.push(parsed);
    if (results.length === MAX_PER_SOURCE) break;
  }
  if (!results.length) throw new Error("No valid dated articles");
  return results;
}

function attribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return match?.[1] ?? match?.[2] ?? "";
}

export function parseCopenhagenNewsroom(html: string, source: NewsFeedSource, now = Date.now()): NewsArticle[] {
  if (html.length > MAX_BYTES) throw new Error("Newsroom response too large");
  const results: NewsArticle[] = [];
  for (const match of html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article\s*>/gi)) {
    const classes = attribute(match[1], "class").split(/\s+/);
    if (!classes.includes("node--type-news")) continue;
    const block = match[2];
    const heading = block.match(/<h2\b[^>]*>([\s\S]*?)<\/h2\s*>/i)?.[1];
    const anchor = heading?.match(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/i);
    const time = block.match(/<time\b([^>]*)>/i);
    if (!anchor || !time) continue;
    const parsed = article(source, anchor[2], "Meddelelse fra Københavns Kommune. Læs kommunens oplysninger og baggrund hos kilden.", attribute(anchor[1], "href"), attribute(time[1], "datetime"), now);
    if (parsed) results.push(parsed);
    if (results.length === MAX_PER_SOURCE) break;
  }
  if (!results.length) throw new Error("No dated newsroom articles");
  return results;
}

async function readBounded(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("Feed too large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty feed");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error("Feed too large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

interface SourceFailure {
  sourceId: string;
  stage: "request" | "body" | "parse";
  reason: "timeout" | "network" | "http" | "redirect" | "size-limit" | "invalid-content" | "body-read";
  elapsedMs: number;
  httpStatus?: number;
}
export interface NewsRefreshDiagnostic {
  event: "news-refresh-failures";
  counts: Record<NewsSource["status"], number>;
  failures: SourceFailure[];
}
interface SourceResult { articles: NewsArticle[]; source: NewsSource; successAt: string | null; failure?: SourceFailure }
interface LastGood { articles: NewsArticle[]; successAt: string }
interface NewsServiceOptions { fetcher?: typeof fetch; now?: () => number; timeoutMs?: number; cacheTtlMs?: number; onDiagnostic?: (diagnostic: NewsRefreshDiagnostic) => void }

export function createNewsService(options: NewsServiceOptions = {}) {
  const fetcher = options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? (() => Date.now());
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const ttl = options.cacheTtlMs ?? CACHE_TTL_MS;
  const lastGood = new Map<string, LastGood>();
  let cache: { response: NewsResponse; expiresAt: number } | null = null;
  let inflight: Promise<NewsResponse> | null = null;

  async function fetchSource(source: NewsFeedSource): Promise<SourceResult> {
    const fresh = lastGood.get(source.id);
    // A failed provider retries sooner without re-fetching healthy providers
    // whose successful responses are still inside their ten-minute window.
    if (fresh && now() - Date.parse(fresh.successAt) < ttl) return { ...fresh, source: { id: source.id, name: source.name, url: source.url, region: source.region, status: "cached", articleCount: fresh.articles.length, checkedAt: fresh.successAt, message: `Gemt nyhedsoversigt. Senest hentet ${fresh.successAt}${source.primary ? " · meddelelser fra kommunen" : ""}.` } };
    const startedAt = now();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let stage: SourceFailure["stage"] = "request";
    let httpStatus: number | undefined;
    const operation = async () => {
      let url = source.url;
      for (let redirects = 0; redirects <= 3; redirects++) {
        stage = "request";
        httpStatus = undefined;
        const response = await fetcher(url, { signal: controller.signal, redirect: "manual", headers: { Accept: source.format === "rss" ? "application/rss+xml, application/xml, text/xml" : "text/html" } });
        httpStatus = response.status;
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location || redirects === 3) throw new Error("Invalid source redirect");
          const next = new URL(location, url);
          if (next.protocol !== "https:" || next.hostname !== new URL(source.url).hostname || next.username || next.password || (next.port && next.port !== "443")) throw new Error("Unapproved source redirect");
          url = next.href;
          continue;
        }
        if (!response.ok) { await response.body?.cancel(); throw new Error("Source unavailable"); }
        stage = "body";
        const content = await readBounded(response);
        if (controller.signal.aborted) throw new Error("Source timeout");
        stage = "parse";
        const articles = source.format === "rss" ? parseNewsRss(content, source, now()) : parseCopenhagenNewsroom(content, source, now());
        const successAt = new Date(now()).toISOString();
        return { articles, successAt };
      }
      throw new Error("Source unavailable");
    };
    try {
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new Error("Source timeout")); }, timeoutMs); });
      const result = await Promise.race([operation(), timeout]);
      lastGood.set(source.id, result);
      return { ...result, source: { id: source.id, name: source.name, url: source.url, region: source.region, status: "ok", articleCount: result.articles.length, checkedAt: result.successAt, ...(source.primary ? { message: "Meddelelser fra kommunen · primærkilde" } : {}) } };
    } catch (error) {
      controller.abort();
      const checkedAt = new Date(now()).toISOString();
      const message = error instanceof Error ? error.message : "";
      // The asynchronous operation updates this stage before rejecting.
      const failureStage = stage as SourceFailure["stage"];
      const failure: SourceFailure = {
        sourceId: source.id, stage: failureStage, elapsedMs: Math.max(0, now() - startedAt),
        reason: timedOut ? "timeout" : message.includes("redirect") ? "redirect" : message === "Feed too large" ? "size-limit" : failureStage === "parse" ? "invalid-content" : failureStage === "body" ? "body-read" : httpStatus !== undefined ? "http" : "network",
        ...(httpStatus === undefined ? {} : { httpStatus }),
      };
      const previous = lastGood.get(source.id);
      if (previous) return { ...previous, failure, source: { id: source.id, name: source.name, url: source.url, region: source.region, status: "cached", articleCount: previous.articles.length, checkedAt, message: `Kilden kunne ikke opdateres. Senest hentet ${previous.successAt}${source.primary ? " · meddelelser fra kommunen" : ""}.` } };
      if (source.id === "kk") return { failure, articles: COPENHAGEN_SNAPSHOT.map((item) => ({ ...item, id: articleId(canonicalKey(item.url)), topics: [...item.topics] })), successAt: COPENHAGEN_SNAPSHOT_VERIFIED_AT, source: { id: source.id, name: source.name, url: source.url, region: source.region, status: "curated", articleCount: COPENHAGEN_SNAPSHOT.length, checkedAt, message: "Kilden kunne ikke opdateres. Udvalgte kommunale meddelelser, manuelt kontrolleret 10. november 2026." } };
      return { articles: [], successAt: null, failure, source: { id: source.id, name: source.name, url: source.url, region: source.region, status: "unavailable", articleCount: 0, checkedAt, message: "Kilden er midlertidigt utilgængelig. Prøv igen senere." } };
    } finally { clearTimeout(timer); }
  }

  async function refresh(): Promise<NewsResponse> {
    const checkedAt = new Date(now()).toISOString();
    let active = 0;
    const waiting: (() => void)[] = [];
    const limitedFetch = async (source: NewsFeedSource) => {
      if (active >= MAX_CONCURRENT_FETCHES) await new Promise<void>((resolve) => { waiting.push(resolve); });
      active++;
      try { return await fetchSource(source); }
      finally { active--; waiting.shift()?.(); }
    };
    // The deadline starts after acquiring a slot. Queued providers therefore
    // retain the full timeout instead of timing out in Cloudflare's fetch queue.
    const settled = await Promise.allSettled(NEWS_FEED_SOURCES.map(limitedFetch));
    const results: SourceResult[] = settled.map((result, i) => result.status === "fulfilled" ? result.value : { articles: [], successAt: null, source: { id: NEWS_FEED_SOURCES[i].id, name: NEWS_FEED_SOURCES[i].name, url: NEWS_FEED_SOURCES[i].url, region: NEWS_FEED_SOURCES[i].region, status: "unavailable", articleCount: 0, checkedAt, message: "Kilden kunne ikke hentes." } });
    const unique = new Map<string, NewsArticle>();
    for (const result of results) for (const item of result.articles) {
      const key = canonicalKey(item.url), existing = unique.get(key);
      if (!existing) unique.set(key, item);
      else {
        const preferred = item.region === "europa" ? item : existing;
        unique.set(key, { ...preferred, topics: [...new Set([...existing.topics, ...item.topics])] });
      }
    }
    const articles = [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, MAX_ARTICLES);
    const sources = results.map((result) => ({ ...result.source, articleCount: articles.filter((item) => item.sourceId === result.source.id).length }));
    const successTimes = results.map((result) => result.successAt).filter((value): value is string => !!value).sort();
    const response: NewsResponse = {
      articles, sources,
      updatedAt: successTimes.at(-1) ?? checkedAt,
      mode: !articles.length ? "unavailable" : sources.every((source) => source.status === "ok") ? "live" : !sources.some((source) => source.status === "ok") && sources.some((source) => source.status === "cached") ? "cached" : "mixed",
    };
    const failures = results.flatMap((result) => result.failure ? [result.failure] : []);
    const retrySoon = failures.length > 0 || settled.some((result) => result.status === "rejected");
    const nextSuccessExpiry = Math.min(now() + ttl, ...results.filter((result) => result.successAt && result.source.status !== "curated").map((result) => Date.parse(result.successAt!) + ttl));
    cache = { response, expiresAt: retrySoon ? now() + FAILURE_CACHE_TTL_MS : nextSuccessExpiry };
    if (failures.length) {
      const counts: NewsRefreshDiagnostic["counts"] = { ok: 0, cached: 0, unavailable: 0, curated: 0 };
      for (const source of sources) counts[source.status]++;
      // Only fixed source IDs, status/stage enums, response codes and durations.
      // Never log response bodies, visitor information or arbitrary errors.
      try { options.onDiagnostic?.({ event: "news-refresh-failures", counts, failures }); } catch { /* Logging must not fail the response. */ }
    }
    return response;
  }

  return async function getNews(): Promise<NewsResponse> {
    if (cache && now() < cache.expiresAt) {
      const sources: NewsSource[] = cache.response.sources.map((source) => source.status === "ok" ? { ...source, status: "cached", message: `Gemt nyhedsoversigt. Senest hentet ${source.checkedAt}${NEWS_FEED_SOURCES.find((definition) => definition.id === source.id)?.primary ? " · meddelelser fra kommunen" : ""}.` } : { ...source });
      return { ...cache.response, articles: cache.response.articles.map((item) => ({ ...item, topics: [...item.topics] })), sources, mode: sources.some((source) => source.status === "cached") ? "cached" : cache.response.mode };
    }
    if (!inflight) inflight = refresh().finally(() => { inflight = null; });
    return inflight;
  };
}

// Per-isolate cache: no database schema or user data involved. Cold Worker
// isolates fetch anew; the curated fallback remains explicitly labelled.
export const getNews = createNewsService({ onDiagnostic: (diagnostic) => { console.warn(JSON.stringify(diagnostic)); } });
