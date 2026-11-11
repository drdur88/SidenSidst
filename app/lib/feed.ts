import { DEFAULT_PREFERENCES, DEFAULT_READER, REGIONS, TOPICS, type FeedPreferences, type NewsArticle, type NewsReader, type NewsSource, type RegionId, type TopicId } from "./news-types";

export function safeUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 3000) return false;
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}
export function isArticle(value: unknown): value is NewsArticle {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return nonEmpty(a.id, 200) && nonEmpty(a.title, 500) && typeof a.description === "string" && a.description.length <= 2000 && safeUrl(a.url) && nonEmpty(a.sourceId, 100) && nonEmpty(a.sourceName, 200) && typeof a.publishedAt === "string" && Number.isFinite(Date.parse(a.publishedAt)) && Array.isArray(a.topics) && a.topics.length > 0 && a.topics.length <= TOPICS.length && a.topics.every((t) => TOPICS.some((topic) => topic.id === t)) && REGIONS.some((r) => r.id === a.region) && typeof a.scope === "string" && ["local", "national", "global"].includes(a.scope) && typeof a.imageKey === "string" && ["city", "climate", "mobility"].includes(a.imageKey) && (a.curated === undefined || typeof a.curated === "boolean");
}
const nonEmpty = (value: unknown, max: number): value is string => typeof value === "string" && !!value.trim() && value.length <= max;
export function isSource(value: unknown): value is NewsSource {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return nonEmpty(s.id, 100) && nonEmpty(s.name, 200) && safeUrl(s.url) && REGIONS.some(region => region.id === s.region) && typeof s.status === "string" && ["ok", "cached", "unavailable", "curated"].includes(s.status) && typeof s.articleCount === "number" && Number.isInteger(s.articleCount) && s.articleCount >= 0 && s.articleCount <= 180 && typeof s.checkedAt === "string" && Number.isFinite(Date.parse(s.checkedAt)) && (s.message === undefined || typeof s.message === "string" && s.message.length <= 2000);
}
export function publicArticle(article: NewsArticle): NewsArticle {
  const { id, title, description, url, sourceId, sourceName, publishedAt, region, scope, imageKey, curated } = article;
  return { id, title, description, url, sourceId, sourceName, publishedAt, topics: [...new Set(article.topics)], region, scope, imageKey, ...(typeof curated === "boolean" ? { curated } : {}) };
}
const uniqueStrings = (value: unknown, max = 500): string[] => Array.isArray(value) ? [...new Set(value.filter((s): s is string => nonEmpty(s, 200)))].slice(0, max) : [];
export function normalizePreferences(value: unknown): FeedPreferences {
  const p = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const topicValues = uniqueStrings(p.topics, Infinity).filter((t): t is TopicId => TOPICS.some((x) => x.id === t));
  const regionValues = uniqueStrings(p.regions, Infinity).filter((r): r is RegionId => REGIONS.some((x) => x.id === r));
  return {
    topics: Array.isArray(p.topics) ? topicValues : [...DEFAULT_PREFERENCES.topics],
    regions: Array.isArray(p.regions) ? regionValues : [...DEFAULT_PREFERENCES.regions],
    hiddenSources: uniqueStrings(p.hiddenSources, 40),
    mutedWords: [...new Set(uniqueStrings(p.mutedWords, Infinity).map((word) => word.trim().toLocaleLowerCase("da")))].slice(0, 20),
    balance: p.balance === "local" || p.balance === "global" ? p.balance : "balanced",
    sort: p.sort === "recent" ? "recent" : "personal",
    period: p.period === "day" || p.period === "week" ? p.period : "all",
    compact: p.compact === true,
  };
}
export function normalizeReader(value: unknown): NewsReader {
  const r = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const saved = Array.isArray(r.saved) ? r.saved.filter(isArticle).map(publicArticle) : [];
  return {
    version: 1,
    preferences: normalizePreferences(r.preferences),
    saved: [...new Map(saved.map((article) => [article.id, article])).values()].slice(0, 100),
    read: uniqueStrings(r.read), hidden: uniqueStrings(r.hidden),
    lastVisit: typeof r.lastVisit === "string" && Number.isFinite(Date.parse(r.lastVisit)) ? r.lastVisit : DEFAULT_READER.lastVisit,
  };
}
export function filterFeed(articles: NewsArticle[], preferences: FeedPreferences, options: { view: string; query: string; topic?: string; source?: string; hidden: string[]; read: string[]; onlyUnread: boolean; now?: number }): NewsArticle[] {
  const now = options.now ?? Date.now();
  const query = options.query.trim().toLocaleLowerCase("da");
  const hidden = new Set(options.hidden), read = new Set(options.read);
  return articles.filter((article) => {
    if (hidden.has(article.id) || preferences.hiddenSources.includes(article.sourceId)) return false;
    if (options.onlyUnread && read.has(article.id)) return false;
    if (!article.topics.some((topic) => preferences.topics.includes(topic))) return false;
    if (!preferences.regions.includes(article.region)) return false;
    if (options.view === "local" && article.scope !== "local" && article.scope !== "national") return false;
    if (options.view === "world" && article.scope !== "global") return false;
    if (options.topic && !article.topics.includes(options.topic as TopicId)) return false;
    if (options.source && article.sourceId !== options.source) return false;
    const text = `${article.title} ${article.description} ${article.sourceName}`.toLocaleLowerCase("da");
    if (preferences.mutedWords.some((word) => text.includes(word))) return false;
    if (query && !text.includes(query)) return false;
    const age = now - Date.parse(article.publishedAt);
    if (preferences.period === "day" && age > 86400000) return false;
    if (preferences.period === "week" && age > 7 * 86400000) return false;
    return true;
  }).sort((a, b) => {
    if (preferences.sort === "recent") return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    const score = (article: NewsArticle) => {
      const topicRank = Math.min(...article.topics.map((topic) => { const i = preferences.topics.indexOf(topic); return i < 0 ? 100 : i; }));
      const ageDays = Math.max(0, (now - Date.parse(article.publishedAt)) / 86400000);
      const preference = preferences.balance === "local" ? (article.scope === "local" ? 2.7 : article.scope === "national" ? 1.5 : 0) : preferences.balance === "global" ? (article.scope === "global" ? 2.7 : 0) : 0;
      return 6 - topicRank * .45 - Math.min(ageDays, 14) * .5 + preference;
    };
    return score(b) - score(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}
export function relativeDate(value: string, now = Date.now()): string {
  const delta = Math.max(0, now - Date.parse(value));
  if (delta < 3600000) return `${Math.max(1, Math.floor(delta / 60000))} min. siden`;
  if (delta < 86400000) return `${Math.floor(delta / 3600000)} t. siden`;
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" }).format(new Date(value));
}
