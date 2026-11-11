import type { NewsArticle } from "./news-types";

// Independently written summaries of six dated announcements verified against
// https://www.kk.dk/nyheder on 10 November 2026. These are a fallback snapshot,
// never presented as a fresh fetch or as independent reporting.
export const COPENHAGEN_SNAPSHOT_VERIFIED_AT = "2026-11-10T21:52:00.000Z";
export const COPENHAGEN_SNAPSHOT: readonly NewsArticle[] = [
  {
    id: "kk-biblioteker-20261110",
    title: "Flere bemandede timer på ti biblioteker",
    description: "Kommunen oplyser, at ti biblioteker har fået længere bemandet åbningstid fra 1. november. Flere bøger og arrangementer følger med.",
    url: "https://www.kk.dk/nyheder/koebenhavns-biblioteker-har-faaet-mere-personale-og-endnu-flere-boeger",
    publishedAt: "2026-11-10T12:00:00.000Z",
    topics: ["kultur"],
    sourceId: "kk", sourceName: "Københavns Kommune", region: "koebenhavn", scope: "local", imageKey: "city", curated: true,
  },
  {
    id: "kk-bystaevneparken-20261110",
    title: "Bystævneparken tager næste skridt mod nye boliger",
    description: "Det første boligudbud i Bystævneparken er sat i gang. Planen omfatter også plejeboliger, botilbud og børneinstitutioner.",
    url: "https://www.kk.dk/nyheder/hundredvis-af-nye-boliger-paa-vej-til-koebenhavnsk-bydel",
    publishedAt: "2026-11-10T12:00:00.000Z",
    topics: ["samfund"],
    sourceId: "kk", sourceName: "Københavns Kommune", region: "koebenhavn", scope: "local", imageKey: "city", curated: true,
  },
  {
    id: "kk-frivillighed-20261109",
    title: "13,8 mio. kr. til frivillige sociale indsatser",
    description: "Socialudvalget har fordelt 13,8 mio. kr. til 196 frivillige projekter i 2027.",
    url: "https://www.kk.dk/nyheder/138-millioner-kroner-til-frivillige-projekter-i-koebenhavn",
    publishedAt: "2026-11-09T12:00:00.000Z",
    topics: ["samfund"],
    sourceId: "kk", sourceName: "Københavns Kommune", region: "koebenhavn", scope: "local", imageKey: "city", curated: true,
  },
  {
    id: "kk-assak-20261106",
    title: "Dansk Råstof skal stå for nyt tilbud til grønlændere",
    description: "Fonden Dansk Råstof skal drive Assak. Tilbuddet til nyankomne, socialt udsatte grønlændere åbner 1. januar 2027.",
    url: "https://www.kk.dk/nyheder/dansk-raastof-skal-drive-huset-assak-for-socialt-udsatte-groenlaendere",
    publishedAt: "2026-11-06T12:00:00.000Z",
    topics: ["samfund"],
    sourceId: "kk", sourceName: "Københavns Kommune", region: "koebenhavn", scope: "local", imageKey: "city", curated: true,
  },
  {
    id: "kk-kulturhoering-20261102",
    title: "Københavnerne inviteres med i kulturpolitikken",
    description: "Kommunens forslag til en kultur- og fritidsstrategi er i offentlig høring. Strategien skal vedtages i begyndelsen af 2027.",
    url: "https://www.kk.dk/nyheder/nu-kan-du-faa-indflydelse-paa-fremtidens-kultur-og-fritidspolitik-i-koebenhavn",
    publishedAt: "2026-11-02T12:00:00.000Z",
    topics: ["kultur", "samfund"],
    sourceId: "kk", sourceName: "Københavns Kommune", region: "koebenhavn", scope: "local", imageKey: "city", curated: true,
  },
  {
    id: "kk-skoleindskrivning-20261102",
    title: "Skoleindskrivningen for 2027 er åben",
    description: "Børn, der fylder seks i 2027, kan skrives op digitalt. Indskrivningen løber fra 2. til 22. november 2026.",
    url: "https://www.kk.dk/nyheder/nu-kan-du-skrive-dit-barn-op-til-skolestart-1",
    publishedAt: "2026-11-02T12:00:00.000Z",
    topics: ["samfund"],
    sourceId: "kk", sourceName: "Københavns Kommune", region: "koebenhavn", scope: "local", imageKey: "city", curated: true,
  },
];
