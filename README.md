# Siden sidst — beta 0.4

Siden sidst is Danish news that remembers and follows up. Readers follow concrete questions, retain their own position in each case, and return to documented developments instead of an endless sequence of disconnected headlines. The same Scandinavian React interface runs on GitHub Pages and the original Site. A Sites-hosted Cloudflare Worker stores the shared case history, source evidence, review records, email waitlist and feedback in D1.

## Product promise: give attention back

**Bliv klogere. Ikke hængende.** — **Hele historien. Fra A til Z. På din tid.**

The product should help readers understand a case and get on with their day. A–Z means preserving the background, current answer, open questions and eventual documented outcome; it does not promise that every case is already resolved. The finite case overview, original sources and explicit reading position make that promise concrete.

- A case card offers changes only when it has new revisions; otherwise it opens the existing history.
- A fresh, unfiltered overview with active followed cases and no pending briefings ends with **“Du er ajour. Resten af dagen er din.”** A quiet history link remains available, without a recommendation loop.
- Paused cases, a failed refresh and cached data have distinct messages. They are never presented as proof that a reader is currently caught up.
- After acknowledging the edition they opened, readers can choose **“Færdig for nu”** to close it. A newer edition remains unread.
- The hero, method panel and footer explain the same three promises: a complete case trajectory, no attention traps, and material insight with minimal unnecessary effort.

### Measures of success

Use these as product goals for voluntary beta research, not as claims of measured results or new tracking:

| Goal | Useful evaluation |
| --- | --- |
| Reach sufficient understanding quickly | Observe how long a tester needs to explain the current status and next step accurately; speed alone is not success. |
| Understand the case over time | Ask a tester to distinguish the background, latest change and remaining uncertainty. |
| Surface material changes reliably | Audit documented changes for relevance, missed developments, duplicate updates, corrections and time to publication. |
| Reduce unnecessary searching | Ask whether the tester needed to reconstruct the history elsewhere and which information was missing. |

Time on site, pageviews, clicks, streaks and return frequency are not optimization targets. This release adds no analytics collection, engagement scoring, browser notifications or email delivery.

## Case product

- **Siden sidst / Mine sager / Opdag:** follow, prioritize and pause individual cases; filter by topic, geography and status.
- **Personal memory:** shown, opened and explicitly acknowledged revisions are separate. Opening the home page never marks a case as caught up. The comparison retains the previous visit's shown version; an old open dialog cannot acknowledge an unseen newer edition.
- **A real case record:** current answer, changes, significance, unresolved questions, the next sourced milestone, immutable historical snapshots and original source links. Corrections remain visible and refer to the earlier edition.
- **Durable shared history:** 10 initial cases, 29 documented developments and 30 source records, reviewed on 11 November 2026. Four Danish cases cover Femern, Lynetteholm, M5 and Bornholm; six international cases cover climate agreements, charging rules and space/science. A repeated Hera schedule announcement is a source check, not an invented new development.
- **Honest freshness:** review records distinguish successful, partial, unavailable and pending checks. Event dates, source publication dates and editorial registration times remain separate. Passing an announced date does not prove that the event happened.
- **Guest profile:** followed cases, priorities, pauses and reading positions persist on this browser. Export/import transfers this profile without email or deletion receipts. There is no account synchronization.

## Editorial follow-up

The restricted `/mcp` endpoint exposes `editor_identity`, `list_case_followups`, `get_case_record`, `record_case_review` and `publish_case_update`. Public readers cannot append history. Writes require the exact owner-configured Site-scoped identity, verified by the hosting platform; no editor is automatically enrolled. Existing evidence is immutable, concurrent revisions are guarded, and transport retries cannot create a duplicate edition.

The recurring review reads original sources, compares evidence with existing editions, writes only material changes, and records failures truthfully. See [the editorial runbook](docs/case-editorial-runbook.md). A normal content review writes D1 data and does not rebuild the frontend. A new source host or catalog expansion requires a deliberate code change.

`CASE_MONITORING_ENABLED` is a server-only operational flag. Leave it unset until the authenticated write/readback path and the Site's matching cloud schedule are verified. The public API and method panel report manual or scheduled operation from that flag; the existence of a schedule alone is not evidence that a review has run. `CASE_EDITOR_USER_ID` belongs in runtime configuration, never the public repository.

## Preserved news feed and forms

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

Topic assignment in the secondary news feed uses keyword rules. RSS articles are not automatically turned into case developments. Bias ratings, automated fact-checking and arbitrary story clustering are not implemented.

## Project structure

| Location | Purpose |
| --- | --- |
| `app/news-app.tsx`, `app/case-app.tsx`, `app/cases.css` | Shared case interface and responsive styling. |
| `app/article-feed.tsx`, `app/news.css` | Preserved customizable article feed. |
| `app/lib/case-types.ts`, `case-reader.ts` | Case contract, validated private reader state and import/export. |
| `app/lib/case-catalog.ts`, `case-store.ts` | Source-reviewed initial cases and durable append-only storage. |
| `app/mcp/route.ts`, `app/lib/case-editor-auth.ts` | Restricted editorial tools and explicit owner authorization. |
| `app/feed-settings.tsx`, `app/feed-settings.css` | Topic, region, source and presentation controls; profile import/export. |
| `app/news-membership.tsx` | Waitlist registration, receipt management and feedback forms. |
| `app/lib/feed.ts`, `app/lib/news-types.ts` | Validated reader state, source/article metadata and feed filtering/ranking. |
| `app/lib/news-fetch.ts`, `app/lib/news-curated.ts` | Bounded source ingestion, caching and dated curated fallback. |
| `web/`, `vite.pages.config.ts`, `tsconfig.pages.json` | Static Pages entry point, build and typecheck, independent of Site identity. |
| `app/api/`, `app/lib/api.ts` | Worker API routes, request validation, CORS, rate limits and response helpers. |
| `db/`, `drizzle/` | D1 schema and schema-only migrations. No subscriber or feedback records are included. |
| `scripts/test-*.mjs` | API, news, feed, case memory, durable history and editor regression suites. |
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
npm run test:cases
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

The repository is [drdur88/SidenSidst](https://github.com/drdur88/SidenSidst). Its public project-site URL is `https://drdur88.github.io/SidenSidst/`; the repository name and asset base preserve that capitalization.

1. Enable Pages in the repository settings and choose **GitHub Actions** as the publishing source.
2. Push to `main`, or manually run the publishing workflow.
3. Wait for both `build` and `deploy` to succeed and open the deployment URL.

The workflow installs locked dependencies, typechecks the frontend, runs the API, feed, news and case regression suites and builds the static application. It uploads **only `dist-pages/`**. API source, D1 records and local runtime files are excluded from the public website artifact.

The repository name is derived from `GITHUB_REPOSITORY`: a project repository uses `/<repository-name>/` as its asset base; a `<owner>.github.io` repository uses `/`. For a custom domain, set the repository variable `PAGES_BASE_PATH` to `/`. Font, stylesheet, script and illustration paths respect the configured base.

The API accepts its own origin and exactly `https://drdur88.github.io`. A different account or custom domain requires a backend allowlist update and corresponding CORS verification. Cookies and browser credentials are omitted from frontend API requests.

Official documentation: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Vite static deployment](https://vite.dev/guide/static-deploy), [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Data and email registration

Preferences, saved articles, read/hidden IDs and the last visit time are stored on the current browser origin. Moving from the original Site to GitHub Pages does not automatically transfer them. Use the feed export/import controls to move supported profile data. Imports validate saved articles and retain only public article fields; email addresses and management receipts are not part of the feed export.

Email registration is a **waitlist**, not an authenticated account. It stores an address and explicit consent in D1. The browser keeps the registration's deletion receipt separately from feed preferences. An interrupted registration attempt can also retain its email and receipt locally so a retry can complete safely. The beta does not verify email ownership or send automatic newsletters.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/cases` | Returns persistent cases, source evidence, complete revisions, latest check state and monitoring mode. |
| `POST /mcp` | Reads public case records; editorial writes require the configured verified owner. |
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
| `npm run test:api` | **API regression suite** | Real route handlers and SQL: consent, deduplication, receipt ownership, deletion, request limits, rate limiting and Pages CORS. |
| `npm run test:feed` | **26 scenarios, 148 assertions passed** | Safe URLs, article/source validation, import privacy, preference normalization, filters, muted phrases, ranking, timezone-aware sorting and collection limits. |
| `npm run test:news` | **16 scenarios passed** | Feed parsing, publisher restrictions, malformed/oversized responses, timeouts, caching, source failures, deduplication, fallback timestamps and route contracts. |
| `npm run test:cases` | **Case suites** | Per-case memory, safe import/export, database restart persistence, immutable corrections, atomic concurrent revisions, source integrity and editorial authorization. |
| `npm run check:pages` | **Passed** | Shared frontend and static build TypeScript types. |
| `npm run build:pages` | **Passed** | Static build with repository-relative HTML, CSS, script and hashed font paths. |

The automated suites use mocked network responses and an isolated SQLite adapter for D1. Case tests exercise the real SQL store and MCP handlers together, as well as the same response validator used by the frontend. They do not exercise production subscriber records, distributed database behavior or actual GitHub publication. Browser QA additionally covered desktop, 390 px and 320 px layouts, feed controls, preference persistence and email registration/deletion in the managed preview.

After publishing, verify the deployed Pages frontend against the live API. The build and tests demonstrate source readiness; successful publication is established by the GitHub deployment and the resulting website.

## Assets and future development

Open Sans licensing is included in `public/fonts/LICENSE-Open-Sans.txt`; generated illustration provenance is in `public/media/IMAGE-CREDITS.md` and `image-prompts.json`. Existing third-party source licenses remain alongside their files. Publisher content remains subject to each publisher's terms. The current RSS integration is not a blanket commercial content license.

This is a free public beta. A paid service, verified user accounts, cross-device synchronization or scheduled editorial email needs additional backend and provider work. GitHub Pages has hosting usage limits, including restrictions on commercial SaaS and transaction-driven sites; reassess hosting when the product's business model changes.
