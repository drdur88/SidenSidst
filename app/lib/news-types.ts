export const TOPICS = [
  { id: "samfund", label: "Samfund", description: "Politik, demokrati og hverdagsliv" },
  { id: "klima", label: "Klima & natur", description: "Energi, miljø og en planet i forandring" },
  { id: "teknologi", label: "Teknologi", description: "AI, digitale liv og nye idéer" },
  { id: "erhverv", label: "Økonomi", description: "Virksomheder, arbejde og økonomi" },
  { id: "kultur", label: "Kultur", description: "Kunst, medier og det, vi deler" },
  { id: "videnskab", label: "Videnskab", description: "Forskning, opdagelser og rummet" },
] as const;
export type TopicId = typeof TOPICS[number]["id"];
export const REGIONS = [
  { id: "koebenhavn", label: "København", scope: "local" },
  { id: "aarhus", label: "Aarhus", scope: "local" },
  { id: "odense", label: "Odense", scope: "local" },
  { id: "aalborg", label: "Aalborg", scope: "local" },
  { id: "danmark", label: "Danmark", scope: "national" },
  { id: "europa", label: "Europa", scope: "global" },
  { id: "verden", label: "Verden", scope: "global" },
] as const;
export type RegionId = typeof REGIONS[number]["id"];
export type NewsScope = "local" | "national" | "global";
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string;
  topics: TopicId[];
  region: RegionId;
  scope: NewsScope;
  imageKey: "city" | "climate" | "mobility";
  curated?: boolean;
}
export interface NewsSource {
  id: string;
  name: string;
  url: string;
  region: RegionId;
  status: "ok" | "cached" | "unavailable" | "curated";
  articleCount: number;
  checkedAt: string;
  message?: string;
}
export interface NewsResponse {
  articles: NewsArticle[];
  sources: NewsSource[];
  updatedAt: string;
  mode: "live" | "mixed" | "cached" | "unavailable";
}
export interface FeedPreferences {
  topics: TopicId[];
  regions: RegionId[];
  hiddenSources: string[];
  mutedWords: string[];
  balance: "balanced" | "local" | "global";
  sort: "personal" | "recent";
  period: "all" | "day" | "week";
  compact: boolean;
}
export interface NewsReader {
  version: 1;
  preferences: FeedPreferences;
  saved: NewsArticle[];
  read: string[];
  hidden: string[];
  lastVisit: string | null;
}
export const DEFAULT_PREFERENCES: FeedPreferences = {
  topics: TOPICS.map((topic) => topic.id),
  regions: ["koebenhavn", "danmark", "europa", "verden"],
  hiddenSources: [], mutedWords: [], balance: "balanced", sort: "personal", period: "all", compact: false,
};
export const DEFAULT_READER: NewsReader = { version: 1, preferences: DEFAULT_PREFERENCES, saved: [], read: [], hidden: [], lastVisit: null };
