/**
 * Behavioral checks for the shared reader model and personalized feed.
 * Imports the real TypeScript modules. No browser, network, storage writes,
 * deployment or production subscriber data is involved.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(project, 'package.json'));
const { build } = require('esbuild');
const compiled = await build({
  stdin: {
    contents: "export * from './app/lib/feed.ts'; export * from './app/lib/news-types.ts';",
    resolveDir: project, sourcefile: 'reader-test-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', target: 'node24', format: 'esm', write: false, logLevel: 'silent',
});
const { safeUrl, isArticle, isSource, normalizePreferences, normalizeReader, filterFeed, relativeDate, DEFAULT_PREFERENCES, REGIONS } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

const now = Date.parse('2026-11-10T12:00:00Z');
const hour = 60 * 60 * 1000;
const day = 24 * hour;
const cases = [];
let assertions = 0;
function test(name, run) { cases.push({ name, run }); }
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message); }
function ok(value, message) { assertions++; assert.ok(value, message); }
function article(id, overrides = {}) {
  return {
    id, title: `Nyhed ${id}`, description: 'En kort beskrivelse.',
    url: `https://publisher.example/news/${encodeURIComponent(id)}`,
    sourceId: 'local-source', sourceName: 'Byens Nyheder',
    publishedAt: new Date(now - hour).toISOString(), topics: ['klima'],
    region: 'koebenhavn', scope: 'local', imageKey: 'city', ...overrides,
  };
}
function preferences(overrides = {}) {
  return normalizePreferences({ ...DEFAULT_PREFERENCES, regions: REGIONS.map(region => region.id), ...overrides });
}
function select(articles, prefs = preferences(), options = {}) {
  return filterFeed(articles, prefs, { view: 'feed', query: '', hidden: [], read: [], onlyUnread: false, now, ...options });
}
function ids(articles) { return articles.map(entry => entry.id); }

test('outbound article URLs require HTTPS without credentials or executable schemes', () => {
  for (const url of ['https://www.dr.dk/nyheder?emne=klima#indhold', 'https://www.kk.dk/nyheder/æøå', 'https://publisher.example/']) {
    equal(safeUrl(url), true, url);
  }
  for (const url of [null, {}, 17, '', 'not a URL', '/relative', '//publisher.example/news', 'http://publisher.example', 'javascript:alert(1)', 'data:text/html,test', 'blob:https://publisher.example/id', 'https://user@publisher.example', 'https://user:password@publisher.example', `https://publisher.example/${'a'.repeat(3000)}`]) {
    equal(safeUrl(url), false, String(url));
  }
});

test('saved articles must have a real identity, headline and source', () => {
  ok(isArticle(article('valid')));
  ok(isArticle(article('short', { description: '', curated: false })));
  for (const field of ['id', 'title', 'sourceId', 'sourceName']) {
    equal(isArticle(article('invalid', { [field]: '' })), false, `empty ${field}`);
    equal(isArticle(article('invalid', { [field]: '   ' })), false, `blank ${field}`);
  }
});

test('saved article validation excludes broken dates, unknown labels, unsafe links and oversized fields', () => {
  const invalid = [
    { publishedAt: 'not a date' }, { topics: [] }, { topics: ['invented'] },
    { region: 'unknown' }, { scope: 'unknown' }, { scope: ['local'] },
    { imageKey: 'https://track.example/pixel' }, { imageKey: ['city'] },
    { id: 'i'.repeat(201) }, { title: 't'.repeat(501) }, { description: 'd'.repeat(2001) },
    { sourceId: 's'.repeat(101) }, { sourceName: 's'.repeat(201) },
    { url: 'javascript:alert(1)' }, { url: 'http://publisher.example/news' },
    { curated: 'false' },
  ];
  for (const fields of invalid) equal(isArticle(article('invalid', fields)), false, JSON.stringify(fields).slice(0, 130));
  for (const value of [null, [], '', 42, {}]) equal(isArticle(value), false);
});

test('source metadata accepts explicit health states and rejects malformed cached entries', () => {
  const source = { id: 'local-source', name: 'Byens Nyheder', url: 'https://publisher.example/news', region: 'koebenhavn', status: 'ok', articleCount: 1, checkedAt: new Date(now).toISOString() };
  for (const status of ['ok', 'cached', 'unavailable', 'curated']) {
    ok(isSource({ ...source, status, articleCount: status === 'unavailable' ? 0 : 1, message: 'Kildens status er kendt.' }));
  }
  const invalid = [
    { id: '' }, { name: ' ' }, { name: { broken: true } }, { url: 'javascript:alert(1)' },
    { url: 'http://publisher.example' }, { region: 'unknown' }, { status: 'unknown' }, { status: ['ok'] },
    { articleCount: -1 }, { articleCount: 181 }, { articleCount: 1.5 }, { articleCount: '1' },
    { articleCount: Infinity }, { articleCount: NaN }, { checkedAt: 'not a date' },
    { checkedAt: null }, { message: {} }, { message: 'x'.repeat(2001) },
  ];
  for (const fields of invalid) equal(isSource({ ...source, ...fields }), false, JSON.stringify(fields).slice(0, 130));
  for (const value of [null, [], 42, 'cached', {}]) equal(isSource(value), false);
  equal([null, source, { ...source, name: {} }, false].filter(isSource), [source]);
});

test('missing preferences recover defaults while explicit empty choices stay empty', () => {
  equal(normalizePreferences(null), DEFAULT_PREFERENCES);
  equal(normalizePreferences('broken'), DEFAULT_PREFERENCES);
  const explicit = normalizePreferences({ topics: [], regions: [] });
  equal(explicit.topics, []);
  equal(explicit.regions, []);
  equal(select([article('a')], explicit), []);
  const first = normalizePreferences(null);
  first.topics.pop(); first.regions.pop();
  equal(normalizePreferences(null), DEFAULT_PREFERENCES, 'normalization must not mutate shared defaults');
});

test('preference normalization retains the requested priority and only known topics and regions', () => {
  const result = normalizePreferences({
    topics: ['teknologi', 'teknologi', 'unknown', 'klima', null, 'samfund'],
    regions: ['verden', false, 'koebenhavn', 'unknown', 'verden'],
    balance: 'invalid', sort: 'invalid', period: 'invalid', compact: 'true',
    email: 'private@example.test', receiptToken: 'private-receipt',
  });
  equal(result.topics, ['teknologi', 'klima', 'samfund']);
  equal(result.regions, ['verden', 'koebenhavn']);
  equal([result.balance, result.sort, result.period, result.compact], ['balanced', 'personal', 'all', false]);
  equal(Object.hasOwn(result, 'email'), false);
  equal(Object.hasOwn(result, 'receiptToken'), false);
});

test('invalid imported labels do not consume space reserved for valid selections', () => {
  const noise = Array.from({ length: 10 }, (_, index) => `unknown-${index}`);
  const result = normalizePreferences({ topics: [...noise, 'teknologi', 'klima'], regions: [...noise, 'aalborg', 'europa'] });
  equal(result.topics, ['teknologi', 'klima']);
  equal(result.regions, ['aalborg', 'europa']);
});

test('muted phrases are trimmed, case normalized, unique and bounded', () => {
  const result = normalizePreferences({ mutedWords: ['  KLIMA  ', 'klima', '', '  ', 'Økonomi', null, 'x'.repeat(201)] });
  equal(result.mutedWords, ['klima', 'økonomi']);
  equal(normalizePreferences({ mutedWords: Array.from({ length: 30 }, (_, index) => `ord ${index}`) }).mutedWords.length, 20);
  const sources = normalizePreferences({ hiddenSources: ['same', 'same', null, ...Array.from({ length: 60 }, (_, index) => `source-${index}`)] });
  equal(sources.hiddenSources.length, 40);
  equal(new Set(sources.hiddenSources).size, 40);
});

test('reader recovery removes broken saved entries and collapses duplicate articles', () => {
  const first = article('same');
  const updated = article('same', { title: 'Opdateret overskrift' });
  const result = normalizeReader({
    saved: [null, first, { ...first, id: 'unsafe', url: 'javascript:alert(1)' }, updated, article('other')],
    read: ['same', 'same', 14], hidden: ['other', 'other', false], lastVisit: 'invalid',
  });
  equal(ids(result.saved), ['same', 'other']);
  equal(new Set(result.saved.map(item => item.id)).size, 2);
  equal(result.read, ['same']); equal(result.hidden, ['other']); equal(result.lastVisit, null);
  equal(normalizeReader({ lastVisit: '2026-11-09T12:00:00Z' }).lastVisit, '2026-11-09T12:00:00Z');
});

test('reader import only retains public article fields and never receipt or account data', () => {
  const publicArticle = article('public', { curated: true });
  const imported = normalizeReader({
    email: 'top-level-private@example.test', receiptToken: 'TOP-LEVEL-RECEIPT',
    membership: { manageToken: 'MEMBERSHIP-SECRET' },
    preferences: { ...preferences(), email: 'preference-private@example.test' },
    saved: [{ ...publicArticle, email: 'article-private@example.test', receiptToken: 'ARTICLE-RECEIPT', metadata: { secret: 'NESTED-SECRET' } }],
  });
  equal(Object.keys(imported).sort(), ['hidden', 'lastVisit', 'preferences', 'read', 'saved', 'version']);
  equal(imported.saved, [publicArticle]);
  const persistedOrExported = JSON.stringify(imported);
  for (const marker of ['private@example.test', 'TOP-LEVEL-RECEIPT', 'MEMBERSHIP-SECRET', 'ARTICLE-RECEIPT', 'NESTED-SECRET']) {
    equal(persistedOrExported.includes(marker), false, marker);
  }
});

test('reader collections stay bounded without allowing duplicates to displace valid saved articles', () => {
  const repeats = Array.from({ length: 50 }, () => article('repeat'));
  const additional = Array.from({ length: 105 }, (_, index) => article(`saved-${index}`));
  const imported = normalizeReader({
    saved: [...repeats, ...additional],
    read: Array.from({ length: 600 }, (_, index) => `read-${index}`),
    hidden: Array.from({ length: 600 }, (_, index) => `hidden-${index}`),
  });
  equal(imported.saved.length, 100);
  equal(new Set(imported.saved.map(item => item.id)).size, 100);
  equal(imported.read.length, 500); equal(imported.hidden.length, 500);
});

test('topic and region selections intersect and a multi-topic article matches any chosen topic', () => {
  const items = [
    article('both', { topics: ['samfund', 'klima'] }),
    article('wrong-topic', { topics: ['teknologi'] }),
    article('wrong-region', { region: 'aarhus' }),
    article('world', { region: 'verden', scope: 'global' }),
  ];
  equal(ids(select(items, preferences({ topics: ['klima'], regions: ['koebenhavn'] }))), ['both']);
  equal(select(items, preferences({ topics: [] })), []);
  equal(select(items, preferences({ regions: [] })), []);
});

test('local and world views preserve region choices, including national stories in local view', () => {
  const items = [article('city'), article('national', { region: 'danmark', scope: 'national' }), article('world', { region: 'verden', scope: 'global' }), article('europe', { region: 'europa', scope: 'global' })];
  equal(ids(select(items, preferences(), { view: 'local' })), ['city', 'national']);
  equal(ids(select(items, preferences(), { view: 'world' })), ['world', 'europe']);
  equal(ids(select(items, preferences({ regions: ['europa'] }), { view: 'world' })), ['europe']);
  equal(select(items, preferences({ regions: ['verden'] }), { view: 'local' }), []);
});

test('excluded sources and hidden stories remain excluded when a source is explicitly selected', () => {
  const items = [article('hidden'), article('excluded', { sourceId: 'excluded-source' }), article('visible', { sourceId: 'visible-source' })];
  const prefs = preferences({ hiddenSources: ['excluded-source'] });
  equal(ids(select(items, prefs, { hidden: ['hidden'] })), ['visible']);
  equal(select(items, prefs, { source: 'excluded-source' }), []);
  equal(ids(select(items, prefs, { source: 'visible-source' })), ['visible']);
});

test('only unread filters read IDs without removing saved or other eligible articles', () => {
  const items = [article('read'), article('unread')];
  equal(ids(select(items, preferences(), { read: ['read'], onlyUnread: true })), ['unread']);
  equal(ids(select(items, preferences(), { read: ['read'], onlyUnread: false })), ['read', 'unread']);
});

test('search is case insensitive across headline, description and source, and respects other filters', () => {
  const items = [article('headline', { title: 'Grønne ØER' }), article('description', { description: 'Livet på grønne øer.' }), article('source', { sourceName: 'Øernes Avis' }), article('miss')];
  equal(ids(select(items, preferences(), { query: '  ØER  ' })), ['headline', 'description', 'source']);
  equal(ids(select(items, preferences(), { query: 'øer', hidden: ['headline', 'source'] })), ['description']);
  equal(select(items, preferences({ topics: ['teknologi'] }), { query: 'øer' }), []);
});

test('muted phrases suppress matching headlines, descriptions or sources and treat punctuation literally', () => {
  const items = [article('headline', { title: 'KLIMA i byen' }), article('description', { description: 'En debat om klima.' }), article('source', { sourceName: 'Klima Avisen' }), article('code', { title: 'Nyheder om C++' }), article('keep', { title: 'En ny park' })];
  const prefs = preferences({ mutedWords: ['  KLIMA ', 'c++'] });
  equal(ids(select(items, prefs)), ['keep']);
  equal(select(items, prefs, { query: 'klima' }), []);
});

test('temporary topic and source filters narrow the selected feed instead of overriding preferences', () => {
  const items = [article('both', { topics: ['klima', 'teknologi'], sourceId: 'one' }), article('single', { sourceId: 'one' }), article('other', { topics: ['teknologi'], sourceId: 'two' })];
  equal(ids(select(items, preferences({ topics: ['klima'] }), { topic: 'teknologi', source: 'one' })), ['both']);
  equal(select(items, preferences({ topics: ['samfund'] }), { topic: 'teknologi', source: 'one' }), []);
});

test('day and week periods use elapsed time with an inclusive cutoff', () => {
  const items = [article('fresh'), article('day-edge', { publishedAt: new Date(now - day).toISOString() }), article('day-old', { publishedAt: new Date(now - day - 1).toISOString() }), article('week-edge', { publishedAt: new Date(now - 7 * day).toISOString() }), article('week-old', { publishedAt: new Date(now - 7 * day - 1).toISOString() })];
  equal(ids(select(items, preferences({ period: 'day', sort: 'recent' }))), ['fresh', 'day-edge']);
  equal(ids(select(items, preferences({ period: 'week', sort: 'recent' }))), ['fresh', 'day-edge', 'day-old', 'week-edge']);
  equal(select(items, preferences({ period: 'all' })).length, 5);
});

test('recent sorting uses chronological time even when accepted timestamps have different offsets', () => {
  const items = [article('earlier-offset', { publishedAt: '2026-11-10T10:30:00+02:00' }), article('later-utc', { publishedAt: '2026-11-10T09:00:00Z' })];
  equal(ids(select(items, preferences({ sort: 'recent' }))), ['later-utc', 'earlier-offset']);
});

test('moving an equally fresh topic to first priority changes personal ordering', () => {
  const items = [article('climate', { topics: ['klima'] }), article('technology', { topics: ['teknologi'] })];
  equal(ids(select(items, preferences({ topics: ['teknologi', 'klima'] }))), ['technology', 'climate']);
  equal(ids(select(items, preferences({ topics: ['klima', 'teknologi'] }))), ['climate', 'technology']);
});

test('local and global balance changes ranking while preserving all matching stories', () => {
  const items = [article('world', { region: 'verden', scope: 'global' }), article('national', { region: 'danmark', scope: 'national' }), article('city')];
  equal(ids(select(items, preferences({ balance: 'local' }))), ['city', 'national', 'world']);
  equal(ids(select(items, preferences({ balance: 'global' }))), ['world', 'national', 'city']);
  equal(select(items, preferences({ balance: 'balanced' })).length, 3);
});

test('recency still matters in personal mode, and recent mode ignores topic and balance ranking', () => {
  const items = [article('old-local', { publishedAt: new Date(now - 13 * day).toISOString() }), article('fresh-world', { topics: ['teknologi'], region: 'verden', scope: 'global' })];
  equal(ids(select(items, preferences({ topics: ['klima', 'teknologi'], balance: 'local' }))), ['fresh-world', 'old-local']);
  equal(ids(select(items, preferences({ topics: ['klima', 'teknologi'], balance: 'local', sort: 'recent' }))), ['fresh-world', 'old-local']);
});

test('personal ranking breaks equal scores by chronological date rather than date spelling', () => {
  const items = [article('earlier-offset', { publishedAt: '2026-10-01T00:30:00+02:00' }), article('later-utc', { publishedAt: '2026-09-30T23:00:00Z' })];
  equal(ids(select(items)), ['later-utc', 'earlier-offset']);
});

test('feed filtering and sorting do not mutate the cached article collection or preferences', () => {
  const items = [article('older', { publishedAt: new Date(now - day).toISOString() }), article('newer')];
  const prefs = preferences({ sort: 'recent' });
  const before = JSON.stringify({ items, prefs });
  equal(ids(select(items, prefs)), ['newer', 'older']);
  equal(JSON.stringify({ items, prefs }), before);
});

test('relative timestamps remain understandable at minute and hour boundaries', () => {
  equal(relativeDate(new Date(now - 30_000).toISOString(), now), '1 min. siden');
  equal(relativeDate(new Date(now - 59 * 60_000).toISOString(), now), '59 min. siden');
  equal(relativeDate(new Date(now - hour).toISOString(), now), '1 t. siden');
  equal(relativeDate(new Date(now - 23 * hour).toISOString(), now), '23 t. siden');
  ok(relativeDate(new Date(now - 3 * day).toISOString(), now).includes('7.'));
});

let passed = 0;
const failures = [];
for (const { name, run } of cases) {
  try { await run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(JSON.stringify({ passed, failed: failures.length, assertions, failures }));
if (failures.length) process.exitCode = 1;
