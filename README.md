# Siden sidst — beta 0.3

Siden sidst is a Danish news reader with a configurable local and global feed, a Scandinavian interface and responsive card/list views. The same React application runs on GitHub Pages and the original Site. A separate Sites-hosted Cloudflare Worker serves news and stores email waitlist registrations and feedback in D1.

## Implemented product

- **Personal feed:** choose and prioritize topics, select regions, emphasize local or global coverage, exclude sources, mute words or phrases, choose a time window and switch between personal ranking and chronological order.
- **Reading tools:** search headlines, excerpts and source names; show unread stories; hide stories with undo; save up to 100 articles; and see eligible unread stories published since the previous visit.
- **Device-local preferences:** feed choices, saved articles and reading state survive reloads when browser storage is available. JSON export/import transfers these choices without email addresses or registration receipts.
- **Real source links:** articles retain the publisher, original publication time and link. Cards identify municipal primary sources and distinguish curated fallback notices from fetched news.
- **Responsive design:** mobile navigation, readable typography, accessible controls and generated topic illustrations. Images are labeled as illustrations, not photographs of the reported events.
- **Working forms:** consent-based email waitlist registration, receipt-based deletion and anonymous product feedback use the live API. This beta does not provide verified accounts, cross-device account synchronization or automatic email delivery.

## News coverage and freshness

The server uses a fixed source list: Copenhagen's municipal news index, Odense's municipal RSS feed, DR Indland, and BBC feeds for World, Europe, Business, Technology, Science and Culture. A configured source may be unavailable; the interface shows its current status rather than assuming that every feed is working. Copenhagen and Odense are municipal primary sources. English headlines remain in the publisher's original language.

Each source supplies at most 20 articles, with at most 180 in the combined response. Fetches have a 12-second per-source timeout and a 2 MB body limit. The server validates publisher URLs, publication dates and feed structure, removes markup from excerpts and deduplicates overlapping BBC stories. It does not copy full articles or publisher photographs.

A Worker isolate caches source results for 10 minutes and retains its last good results while it remains alive. This cache is not durable across new isolates. Failed sources can reuse a previous response with a visible cached status. If Copenhagen cannot be fetched and has no cached result, six explicitly curated notices provide a dated fallback verified on **10 November 2026**. Original publication and verification times remain visible; old fallback material is not stamped as newly reported news.

Topic assignment uses keyword rules. Bias ratings, automated fact-checking, story clustering, translated summaries and automatic follow-up tracking are not implemented.

## Project structure

| Location | Purpose |
| --- | --- |
| `app/news-app.tsx`, `app/news.css` | Shared reader interface and responsive styling. |
| `app/feed-settings.tsx`, `app/feed-settings.css` | Topic, region, source and presentation controls; profile import/export. |
| `app/news-membership.tsx` | Waitlist registration, receipt management and feedback forms. |
| `app/lib/feed.ts`, `app/lib/news-types.ts` | Validated reader state, source/article metadata and feed filtering/ranking. |
| `app/lib/news-fetch.ts`, `app/lib/news-curated.ts` | Bounded source ingestion, caching and dated curated fallback. |
| `web/`, `vite.pages.config.ts`, `tsconfig.pages.json` | Static Pages entry point, build and typecheck, independent of Site identity. |
| `app/api/`, `app/lib/api.ts` | Worker API routes, request validation, CORS, rate limits and response helpers. |
| `db/`, `drizzle/` | D1 schema and schema-only migrations. No subscriber or feedback records are included. |
| `scripts/test-api.mjs`, `scripts/test-feed.mjs`, `scripts/test-news.mjs` | API, reader and news regression suites. |
| `public/media/`, `public/fonts/` | Generated illustrations, image credits/prompts and licensed Open Sans font files. |
| `.github/workflows/pages.yml` | Check, build and deploy only the static frontend. |

The original fictional demonstration component remains in the source for reference; the active home page renders `NewsApp`.

## Continue development in Work

Open or clone this repository as a project in Work. This is a source checkout ready for further development; the repository and its scripts do not themselves create or transfer a Work workspace.

Use **Node.js 24** and the committed npm lockfile:

```sh
npm ci
npm run check:pages
npm run test:api
npm run test:feed
npm run test:news
npm run build:pages
```

The static build is written to `dist-pages/`. It requires no API keys. `VITE_API_ORIGIN` is a public service URL; it defaults to `https://siden-sidst-beta.doriansorian.chatgpt.site`.

For a local frontend preview:

```sh
npx vite --config vite.pages.config.ts --host 127.0.0.1
```

Local browser interactions can be tested there. The production API allows browser requests only from its configured frontend origins, so a localhost preview is not automatically authorized to use the live forms or news endpoint. Use the managed Sites preview for integrated Worker/D1 browser testing, or configure an appropriate development backend and explicit origin allowlist.

The full backend source and existing `npm run dev` / `npm run build` commands are preserved. Those managed Sites commands require that deployment's hosting configuration and bindings. This public export deliberately omits `.openai/hosting.json`, credentials and runtime/database state. The independent Pages commands above do not require that file. Publishing from this repository to GitHub Pages does not deploy or reconfigure the Worker backend.

## Publish to GitHub Pages

The repository is [drdur88/SidenSidst](https://github.com/drdur88/SidenSidst). Its expected project-site URL after successful publication is `https://drdur88.github.io/SidenSidst/`; the repository name and asset base preserve that capitalization.

1. Enable Pages in the repository settings and choose **GitHub Actions** as the publishing source.
2. Push to `main`, or manually run the publishing workflow.
3. Wait for both `build` and `deploy` to succeed and open the deployment URL.

The workflow installs locked dependencies, typechecks the frontend, runs all three regression suites and builds the static application. It uploads **only `dist-pages/`**. API source, D1 records and local runtime files are excluded from the public website artifact.

The repository name is derived from `GITHUB_REPOSITORY`: a project repository uses `/<repository-name>/` as its asset base; a `<owner>.github.io` repository uses `/`. For a custom domain, set the repository variable `PAGES_BASE_PATH` to `/`. Font, stylesheet, script and illustration paths respect the configured base.

The API accepts its own origin and exactly `https://drdur88.github.io`. A different account or custom domain requires a backend allowlist update and corresponding CORS verification. Cookies and browser credentials are omitted from frontend API requests.

Official documentation: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite static deployment](https://vite.dev/guide/static-deploy), [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Data and email registration

Preferences, saved articles, read/hidden IDs and the last visit time are stored on the current browser origin. Moving from the original Site to GitHub Pages does not automatically transfer them. Use the feed export/import controls to move supported profile data. Imports validate saved articles and retain only public article fields; email addresses and management receipts are not part of the feed export.

Email registration is a **waitlist**, not an authenticated account. It stores an address and explicit consent in D1. The browser keeps the registration's deletion receipt separately from feed preferences. An interrupted registration attempt can also retain its email and receipt locally so a retry can complete safely. The beta does not verify email ownership or send automatic newsletters.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/news` | Returns validated articles, source status and freshness metadata. |
| `GET /api/health` | Reports application health/version and database availability. |
| `POST /api/subscriptions` | Validates email and consent, deduplicates atomically and stores a hash of a random 256-bit receipt. |
| `DELETE /api/subscriptions` | Deletes a registration only when its original receipt is supplied. |
| `POST /api/feedback` | Stores product feedback separately from email registrations. |

A duplicate signup does not disclose or alter the original registration. A receipt returned for a duplicate cannot delete the original row. Keep the original deletion code; the interface allows manual entry when switching browsers or frontend origins.

Write routes validate JSON size and shape, enforce rate limits and reject unsupported origins. `OPTIONS` checks origins, requested methods and headers without writing records or consuming a rate-limit counter. Allowed origins receive CORS headers on both successful and error responses.

Current registrations submit `interests: []`; the legacy interest validator still recognizes only the six original fictional case IDs. Generic feedback submits `storyId: null`. Live article IDs must not be placed in those legacy fields without extending the server contract first.

There is no public subscriber-list or administration API. Authorized Site owners can inspect D1 through authenticated hosting tools. Subscriber records do not contain raw IP addresses; temporary hashed buckets support rate limiting.

## Verification

| Command | Verified result | Main coverage |
| --- | --- | --- |
| `npm run test:api` | **28 scenarios, 278 assertions passed** | Real route handlers and SQL: consent, deduplication, receipt ownership, deletion, request limits, rate limiting and Pages CORS. |
| `npm run test:feed` | **26 scenarios, 148 assertions passed** | Safe URLs, article/source validation, import privacy, preference normalization, filters, muted phrases, ranking, timezone-aware sorting and collection limits. |
| `npm run test:news` | **16 scenarios passed** | Feed parsing, publisher restrictions, malformed/oversized responses, timeouts, caching, source failures, deduplication, fallback timestamps and route contracts. |
| `npm run check:pages` | **Passed** | Shared frontend and static build TypeScript types. |
| `npm run build:pages` | **Passed** | Static build with repository-relative HTML, CSS, script and hashed font paths. |

The automated suites use mocked network responses and an isolated SQLite adapter for D1. They do not exercise production subscriber records, distributed database behavior or actual GitHub publication. Browser QA additionally covered desktop, 390 px and 320 px layouts, feed controls, preference persistence and email registration/deletion in the managed preview.

After publishing, verify the deployed Pages frontend against the live API. The build and tests demonstrate source readiness; successful publication is established by the GitHub deployment and the resulting website.

## Assets and future development

Open Sans licensing is included in `public/fonts/LICENSE-Open-Sans.txt`; generated illustration provenance is in `public/media/IMAGE-CREDITS.md` and `image-prompts.json`. Existing third-party source licenses remain alongside their files. Publisher content remains subject to each publisher's terms. The current RSS integration is not a blanket commercial content license.

This is a free public beta. A paid service, verified user accounts, cross-device synchronization or scheduled editorial email needs additional backend and provider work. GitHub Pages has hosting usage limits, including restrictions on commercial SaaS and transaction-driven sites; reassess hosting when the product's business model changes.
