/** Bounded feed/parser + service/route integration checks. All network is mocked. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(project, 'package.json'));
const { build } = require('esbuild');
const compiled = await build({
  stdin: {
    contents: "export * from './app/lib/news-fetch.ts'; export * from './app/lib/news-curated.ts'; export { isArticle } from './app/lib/feed.ts'; import * as route from './app/api/news/route.ts'; export { route };",
    resolveDir: project, sourcefile: 'news-test-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', target: 'node24', format: 'esm', write: false, logLevel: 'silent',
  plugins: [{ name: 'unused-cloudflare-binding', setup(builder) {
    builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'test-binding', namespace: 'news-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'news-test' }, () => ({ contents: 'export const env = {};', loader: 'js' }));
  } }],
});
const news = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const sources = news.NEWS_FEED_SOURCES;
const bbc = sources.find((source) => source.id === 'bbc-world');
const kk = sources.find((source) => source.id === 'kk');
const odense = sources.find((source) => source.id === 'odense');
const initialTime = Date.parse('2026-11-11T10:00:00Z');
const published = 'Tue, 10 Nov 2026 12:00:00 GMT';
const cases = [];
function test(name, run) { cases.push({ name, run }); }
function item({ title = 'A real headline', description = 'A short source excerpt.', url = 'https://www.bbc.com/news/articles/example', date = published } = {}) {
  return `<item><title>${title}</title><description>${description}</description><link>${url}</link><pubDate>${date}</pubDate></item>`;
}
function rss(items = item()) { return `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>News</title>${items}</channel></rss>`; }
function newsroom({ link = '/nyheder/test', date = '2026-11-10T12:00:00Z', title = 'Flere bøger på biblioteket' } = {}) {
  return `<html><body><article class="node node--type-news node--view-mode-search-result"><time datetime="${date}"></time><h2 class="node-title"><a href="${link}"><span>${title}</span></a></h2><div class="field--name-teaser"><script>doNotExpose()</script>Private injected body must not be copied</div></article></body></html>`;
}
function validResponse(url) {
  const source = sources.find((entry) => entry.url === String(url));
  if (!source) throw new Error(`Unexpected fetch: ${url}`);
  if (source.id === 'kk') return new Response(newsroom());
  return new Response(rss(item({ url: `https://${source.hosts[0]}/news/${source.id}` })));
}

test('RSS handles CDATA, namespaces, comments, safe entities and inline text order', () => {
  const xml = rss(item({
    title: '<![CDATA[Klima &amp; København &#x1F30D;]]>',
    description: '<![CDATA[Text <b>in bold</b> &lt;script&gt;danger()&lt;/script&gt; &#248;]]>',
    url: 'https://www.bbc.com/news/articles/a?at_medium=RSS&amp;at_campaign=rss',
  })).replace('</item>', '<media:thumbnail url="https://photos.example/image.jpg" width="240" /><!-- comment --></item>');
  const [article] = news.parseNewsRss(xml, bbc, initialTime);
  assert.equal(article.title, 'Klima & København 🌍');
  assert.equal(article.description, 'Text in bold ø');
  assert.equal(article.url, 'https://www.bbc.com/news/articles/a?at_medium=RSS&at_campaign=rss');
  assert.ok(!JSON.stringify(article).includes('photos.example'));
  assert.ok(article.topics.includes('klima'));
  assert.equal(article.publishedAt, '2026-11-10T12:00:00.000Z');
  assert.equal(news.parseNewsRss(rss(item({ title: 'A <b>strong</b> result' })), bbc, initialTime)[0].title, 'A strong result');
  assert.ok(news.isArticle(article));
});

test('CDATA containing closing-tag text does not split RSS items', () => {
  const parsed = news.parseNewsRss(rss(item({ description: '<![CDATA[Before </item> after]]>' })), bbc, initialTime);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].description, 'Before after');
});

test('empty, HTML, malformed and entity-expanding responses are feed failures', () => {
  for (const xml of ['', '<html><body>Site Unavailable</body></html>', '<rss><channel></rss>', '<rss><channel></channel></rss>', '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel></channel></rss>', rss(item()).replace('</title>', '</broken>'), '<rss/><rss/>']) {
    assert.throws(() => news.parseNewsRss(xml, bbc, initialTime));
  }
});

test('only HTTPS article URLs on the named publisher are accepted', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'http://www.bbc.com/news', 'https://user:password@www.bbc.com/news', 'https://www.bbc.com.evil.example/news', 'https://127.0.0.1/admin', 'https://www.bbc.com:8443/news', '//evil.example/news', 'https://www.bbc.com/\nnews']) {
    assert.equal(news.newsUrl(url, bbc), null, url);
  }
  assert.equal(news.newsUrl('/nyheder/nyt', kk), 'https://www.kk.dk/nyheder/nyt');
});

test('invalid, missing and future dates are skipped without replacing them with now', () => {
  const invalid = ['', 'not a date', '1965-01-01', '2027-01-01T00:00:00Z', '2026-99-35T00:00:00Z'];
  const parsed = news.parseNewsRss(rss(invalid.map((date) => item({ date })).join('') + item({ url: 'https://www.bbc.com/news/good' })), bbc, initialTime);
  assert.equal(parsed.length, 1);
  assert.ok(parsed[0].url.endsWith('/good'));
  assert.equal(parsed[0].publishedAt, '2026-11-10T12:00:00.000Z');
});

test('article counts and text sizes are bounded and full content is excluded', () => {
  const xml = rss(Array.from({ length: 40 }, (_, index) => item({ title: 'T'.repeat(1000), description: 'D'.repeat(3000), url: `https://www.bbc.com/news/${index}` }).replace('</item>', '<content:encoded>DO NOT IMPORT THIS BODY</content:encoded></item>')).join(''));
  const parsed = news.parseNewsRss(xml, bbc, initialTime);
  assert.equal(parsed.length, 20);
  assert.equal(parsed[0].title.length, 500);
  assert.equal(parsed[0].description.length, 180);
  assert.ok(!JSON.stringify(parsed).includes('DO NOT IMPORT'));
  assert.throws(() => news.parseNewsRss(' '.repeat(2 * 1024 * 1024 + 1), bbc, initialTime));
});

test('Odense CDATA + capitalized Guid and Copenhagen metadata parse into the shared contract', () => {
  const xml = '\uFEFF' + rss(item({ title: '<![CDATA[Nyt i Næsby]]>', url: 'https://www.odense.dk/presse/nyheder/test' }).replace('</item>', '<Guid>{ID}</Guid></item>'));
  const [local] = news.parseNewsRss(xml, odense, initialTime);
  assert.equal(local.region, 'odense');
  assert.equal(local.sourceName, 'Odense Kommune');
  const [copenhagen] = news.parseCopenhagenNewsroom(newsroom(), kk, initialTime);
  assert.equal(copenhagen.url, 'https://www.kk.dk/nyheder/test');
  assert.ok(copenhagen.topics.includes('kultur'));
  assert.ok(!copenhagen.description.includes('Private injected'));
  assert.ok(news.isArticle(copenhagen));
  assert.throws(() => news.parseCopenhagenNewsroom('<html>No news here</html>', kk, initialTime));
  assert.throws(() => news.parseCopenhagenNewsroom(newsroom({ link: '//evil.example/' }), kk, initialTime));
});

test('concurrent requests share work, cached results preserve timestamps, and failures use last-good data', async () => {
  let time = initialTime, calls = 0, fail = false;
  const get = news.createNewsService({ now: () => time, fetcher: async (url) => { calls++; await Promise.resolve(); if (fail) throw new Error('offline'); return validResponse(url); } });
  const [first, second] = await Promise.all([get(), get()]);
  assert.equal(calls, sources.length);
  assert.deepEqual(first, second);
  assert.equal(first.mode, 'live');
  assert.equal(first.articles.length, sources.length);
  assert.ok(first.articles.every(news.isArticle));
  time += 60_000;
  const cached = await get();
  assert.equal(calls, sources.length);
  assert.equal(cached.mode, 'cached');
  assert.ok(cached.sources.every((source) => source.status === 'cached'));
  assert.equal(cached.updatedAt, first.updatedAt);
  cached.articles[0].title = 'visitor mutation';
  assert.notEqual((await get()).articles[0].title, 'visitor mutation');
  time += 600_000; fail = true;
  const stale = await get();
  assert.equal(calls, sources.length * 2);
  assert.equal(stale.mode, 'cached');
  assert.equal(stale.updatedAt, first.updatedAt);
  assert.ok(stale.sources.every((source) => source.checkedAt === new Date(time).toISOString()));
  assert.ok(stale.sources.every((source) => source.message.includes(first.updatedAt)));
});

test('failed sources cannot erase healthy sources and curated fallback is explicit', async () => {
  const get = news.createNewsService({ now: () => initialTime, fetcher: async (url) => String(url) === odense.url ? validResponse(url) : new Response('<html>Site Unavailable</html>') });
  const result = await get();
  assert.equal(result.mode, 'mixed');
  assert.equal(result.sources.find((source) => source.id === 'kk').status, 'curated');
  assert.equal(result.sources.find((source) => source.id === 'dr-indland').status, 'unavailable');
  assert.equal(result.sources.find((source) => source.id === 'odense').status, 'ok');
  assert.equal(result.articles.filter((article) => article.curated).length, 6);
  assert.ok(result.articles.every(news.isArticle));
  assert.ok(result.sources.every((source) => source.url.startsWith('https://')));
});

test('upstream fetch concurrency never exceeds five', async () => {
  let active = 0, peak = 0;
  const get = news.createNewsService({ now: () => initialTime, fetcher: async (url) => {
    active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return validResponse(url);
  } });
  const result = await get();
  assert.equal(peak, 5);
  assert.equal(result.mode, 'live');
  assert.equal(result.sources.filter((source) => source.status === 'ok').length, sources.length);
});

test('failed refreshes retry after sixty seconds while successful providers keep ten-minute caches', async () => {
  let time = initialTime, failed = true;
  const calls = new Map();
  const get = news.createNewsService({ now: () => time, fetcher: async (url) => {
    calls.set(String(url), (calls.get(String(url)) || 0) + 1);
    if (url === odense.url && failed) throw new Error('network failure');
    return validResponse(url);
  } });
  await get();
  time += 59_999;
  await get();
  assert.equal(calls.get(odense.url), 1);
  time += 1; failed = false;
  const recovered = await get();
  assert.equal(calls.get(odense.url), 2);
  assert.equal(calls.get(bbc.url), 1);
  assert.equal(recovered.sources.find((source) => source.id === 'odense').status, 'ok');
  assert.equal(recovered.sources.find((source) => source.id === bbc.id).checkedAt, new Date(initialTime).toISOString());
  time = initialTime + 600_000;
  await get();
  assert.equal(calls.get(bbc.url), 2, 'Healthy-source expiry cannot drift after another source recovers');
  assert.equal(calls.get(odense.url), 2, 'Newly recovered source remains fresh');
});

test('diagnostics contain failure stages and aggregate counts without arbitrary errors or article text', async () => {
  const reports = [];
  const get = news.createNewsService({ now: () => initialTime, onDiagnostic: (report) => reports.push(report), fetcher: async (url) => {
    if (url === kk.url) throw new Error('secret arbitrary error text');
    if (url === odense.url) return new Response('<html>Not RSS</html>');
    return new Response('Denied body', { status: 403 });
  } });
  const response = await get();
  assert.equal(reports.length, 1);
  assert.deepEqual(reports[0].counts, { ok: 0, cached: 0, unavailable: 8, curated: 1 });
  assert.equal(reports[0].failures.find((failure) => failure.sourceId === 'kk').reason, 'network');
  assert.equal(reports[0].failures.find((failure) => failure.sourceId === 'odense').stage, 'parse');
  assert.equal(reports[0].failures.find((failure) => failure.sourceId === bbc.id).httpStatus, 403);
  assert.ok(!JSON.stringify(reports).includes('secret arbitrary'));
  assert.ok(!JSON.stringify(response).includes('failures'));
});

test('all-offline fallback preserves the actual curated verification date', async () => {
  const get = news.createNewsService({ now: () => initialTime, fetcher: async () => { throw new Error('offline'); } });
  const result = await get();
  assert.equal(result.updatedAt, news.COPENHAGEN_SNAPSHOT_VERIFIED_AT);
  assert.ok(result.articles.every((article) => article.curated));
  assert.equal(result.sources.filter((source) => source.status === 'curated').length, 1);
});

test('overlapping BBC feeds deduplicate canonical links and retain the more specific region', async () => {
  const get = news.createNewsService({ now: () => initialTime, fetcher: async (url) => String(url).includes('bbci.co.uk') ? new Response(rss(item({ url: 'https://www.bbc.com/news/shared?at_campaign=rss' }))) : validResponse(url) });
  const result = await get();
  const shared = result.articles.filter((article) => article.url.includes('/shared'));
  assert.equal(shared.length, 1);
  assert.equal(shared[0].region, 'europa');
  assert.ok(shared[0].topics.includes('teknologi'));
  assert.equal(result.sources.reduce((sum, source) => sum + source.articleCount, 0), result.articles.length);
});

test('timeouts, oversized bodies and off-host redirects fail without hanging', async () => {
  let cancelled = 0;
  const fetcher = async (url, options) => {
    if (url === kk.url) return new Response(null, { status: 302, headers: { Location: 'https://internal.example/secret' } });
    if (url === odense.url) return new Response(new Uint8Array(2 * 1024 * 1024 + 1));
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => { cancelled++; reject(new Error('aborted')); }, { once: true }));
  };
  const get = news.createNewsService({ now: () => initialTime, timeoutMs: 15, fetcher });
  const result = await get();
  assert.equal(cancelled, sources.length - 2);
  assert.equal(result.sources.find((source) => source.id === 'kk').status, 'curated');
  assert.equal(result.sources.find((source) => source.id === 'odense').status, 'unavailable');
});

test('real GET and OPTIONS handlers expose only allowed CORS origins and return the exact envelope', async () => {
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (url) => validResponse(url);
  try {
    const request = new Request('https://siden-sidst.test/api/news', { headers: { Origin: 'https://drdur88.github.io' } });
    const response = await news.route.GET(request);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://drdur88.github.io');
    const payload = await response.json();
    assert.deepEqual(Object.keys(payload).sort(), ['articles', 'mode', 'sources', 'updatedAt']);
    const preflight = await news.route.OPTIONS(new Request(request.url, { method: 'OPTIONS', headers: { Origin: 'https://drdur88.github.io', 'Access-Control-Request-Method': 'GET' } }));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET');
    const denied = await news.route.OPTIONS(new Request(request.url, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' } }));
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const wrongMethod = await news.route.OPTIONS(new Request(request.url, { method: 'OPTIONS', headers: { Origin: 'https://drdur88.github.io', 'Access-Control-Request-Method': 'POST' } }));
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers.get('access-control-allow-origin'), 'https://drdur88.github.io');
  } finally { globalThis.fetch = savedFetch; }
});

let passed = 0;
for (const { name, run } of cases) {
  try { await run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { process.exitCode = 1; console.error(`FAIL ${name}: ${error.stack}`); }
}
console.log(`${passed}/${cases.length} news checks passed. Network, deployment and durable edge caching are not exercised by these mocks.`);
