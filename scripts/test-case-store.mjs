/** Real SQL and case-store/API contract tests in isolated SQLite databases.
 * No live network, production records, hosting, identity gateway or editor MCP.
 */
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(project, 'package.json'));
const { build } = require('esbuild');
const env = {};
globalThis.__SIDEN_CASE_STORE_ENV__ = env;
let sqlite, db;
let passed = 0;
let assertions = 0;
const failures = [], tests = [];
const fixed = '2020-03-01T09:00:00.000Z';
const currentTime = () => new Date().toISOString();
const clone = value => JSON.parse(JSON.stringify(value));

function fixture(caseId = 'bus-route') {
  const source = { id: 'source-v1', title: 'Beslutningsreferat', publisher: 'Eksempelkommune', url: 'https://example.org/transport/decision', publishedAt: '2020-01-01', checkedAt: fixed, evidence: 'Kommunen vedtog at undersøge en omlægning. Dette er isolerede testdata.' };
  const first = { id: 'proposal', revision: 1, kind: 'background', title: 'Forslag fremlagt', change: 'Et konkret forslag om omlægning er fremlagt.', whyItMatters: 'Ruten kan ændres.', occurredAt: '2020-01-01', recordedAt: fixed, sourceIds: [source.id], snapshot: { status: 'active', answer: 'Forslaget er fremlagt.', openQuestions: ['Hvornår træffes en beslutning?'], nextStep: { label: 'Afventer offentliggjort beslutningsdato.', expectedAt: null, sourceIds: [] } } };
  const second = { ...clone(first), id: 'hearing', revision: 2, kind: 'development', title: 'Høring åbnet', change: 'Der er åbnet en offentlig høring.', occurredAt: '2020-02-01', snapshot: { ...clone(first.snapshot), status: 'awaiting', answer: 'Forslaget er sendt i høring.', nextStep: { label: 'Afventer høringssvar.', expectedAt: null, sourceIds: [source.id] } } };
  return { id: caseId, question: 'Bliver busruten omlagt?', description: 'En konkret sag i et isoleret testmiljø.', topics: ['samfund'], region: 'koebenhavn', scope: 'local', imageKey: 'mobility', sources: [source], updates: [first, second], monitoring: { sourceUrls: [source.url], keywords: ['busrute'], reviewEveryHours: 24 }, lastCheck: { checkedAt: fixed, status: 'checked', note: 'De dokumenterede testkilder er gennemgået.', sourceIds: [source.id] } };
}
const catalog = [fixture(), fixture('global-case')];

class Statement {
  constructor(database, sql, parameters = []) { this.db = database; this.sql = sql; this.parameters = parameters; }
  bind(...values) { assert.ok(values.length <= 100, 'D1 statement parameter budget'); return new Statement(this.db, this.sql, values); }
  async all() { return { success: true, results: this.db.prepare(this.sql).all(...this.parameters), meta: { changes: 0 } }; }
  async first(column) { const row = this.db.prepare(this.sql).get(...this.parameters); return row ? (column === undefined ? row : row[column]) : null; }
  async run() { const result = this.db.prepare(this.sql).run(...this.parameters); return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; }
}
class SqliteD1 {
  constructor(database) { this.db = database; this.batchCount = 0; }
  prepare(sql) { return new Statement(this.db, sql); }
  async batch(statements) {
    this.batchCount++;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) {
        const compiled = this.db.prepare(statement.sql);
        const read = compiled.columns().length > 0;
        if (read) results.push({ success: true, results: compiled.all(...statement.parameters), meta: { changes: 0 } });
        else { const r = compiled.run(...statement.parameters); results.push({ success: true, results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }); }
      }
      this.db.exec('COMMIT');
      return results;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
const migrationNames = (await readdir(path.join(project, 'drizzle'))).filter(file => file.endsWith('.sql')).sort();
const migrations = await Promise.all(migrationNames.map(file => readFile(path.join(project, 'drizzle', file), 'utf8')));
function reset(file = ':memory:', migrate = true) {
  sqlite?.close(); sqlite = new DatabaseSync(file); sqlite.exec('PRAGMA foreign_keys=ON');
  if (migrate) for (const sql of migrations) sqlite.exec(sql);
  db = new SqliteD1(sqlite); env.DB = db; delete env.CASE_MONITORING_ENABLED;
}
const compiled = await build({
  stdin: { contents: "export * as store from './app/lib/case-store.ts'; export * as route from './app/api/cases/route.ts'; export * as reader from './app/lib/case-reader.ts';", resolveDir: project, sourcefile: 'case-store-tests.ts', loader: 'ts' },
  bundle: true, platform: 'node', target: 'node24', format: 'esm', write: false, logLevel: 'silent',
  plugins: [{ name: 'case-test-environment', setup(builder) {
    builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'cloudflare', namespace: 'test-env' }));
    builder.onLoad({ filter: /.*/, namespace: 'test-env' }, () => ({ contents: 'export const env = globalThis.__SIDEN_CASE_STORE_ENV__;', loader: 'js' }));
    builder.onResolve({ filter: /case-catalog$/ }, () => ({ path: 'catalog', namespace: 'test-catalog' }));
    builder.onLoad({ filter: /.*/, namespace: 'test-catalog' }, () => ({ contents: `export const CASE_CATALOG = ${JSON.stringify(catalog)};`, loader: 'js' }));
  } }],
});
const { store, route, reader } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message); }
function ok(value, message) { assertions++; assert.ok(value, message); }
async function rejects(action, code) { assertions++; await assert.rejects(action, error => error instanceof store.CaseStoreError && error.code === code); }
function count(table) { return sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n; }
function test(name, run) { tests.push({ name, run }); }
function next(overrides = {}) { return { ...clone(catalog[0].updates[1]), id: 'decision', revision: 3, kind: 'decision', title: 'Omlægningen vedtaget', change: 'Kommunen har vedtaget omlægningen efter høring.', whyItMatters: 'Planen har passeret beslutningen, mens gennemførelsen fortsat afventes.', recordedAt: currentTime(), snapshot: { ...clone(catalog[0].updates[1].snapshot), status: 'active', answer: 'Omlægningen er vedtaget, men endnu ikke gennemført.' }, ...overrides }; }
async function seed(items = catalog) { await store.ensureCaseCatalog(db, items); }

test('schema migration adds independent case tables without removing existing data tables', async () => {
  equal(count('beta_subscriptions'), 0); equal(count('beta_feedback'), 0); equal(count('news_cases'), 0);
  await seed(); equal(count('news_cases'), 2); equal(count('case_sources'), 2); equal(count('case_updates'), 4); equal(count('case_checks'), 2);
  const saved = await store.readCases(db); equal(saved.map(c => c.id), ['bus-route', 'global-case']); equal(saved[0], catalog[0]);
});

test('concurrent initialization is idempotent and catalog changes cannot overwrite existing history', async () => {
  await Promise.all([seed(), seed(), seed()]);
  const altered = clone(catalog); altered[0].description = 'Et nyt katalog må ikke omskrive historikken.'; altered[0].updates[0].change = 'Ændret start.';
  await seed(altered); equal(count('case_updates'), 4); equal((await store.readCase(db, 'bus-route')).updates[0].change, catalog[0].updates[0].change); equal((await store.readCase(db, 'bus-route')).description, catalog[0].description);
});

test('history survives closing the database and reopening with a fresh D1 adapter', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'siden-case-store-')); const file = path.join(folder, 'archive.sqlite');
  try {
    reset(file); await seed(); await store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next() });
    reset(file, false); const saved = await store.readCase(db, 'bus-route'); equal(saved.updates.length, 3); equal(saved.updates[0], catalog[0].updates[0]);
    await seed(); equal((await store.readCase(db, 'bus-route')).updates.length, 3);
  } finally { sqlite.close(); sqlite = undefined; await rm(folder, { recursive: true, force: true }); }
});

test('a late-discovered old event is appended by revision while preserving event and recording dates', async () => {
  await seed(); const update = next({ occurredAt: '2019-12-01' });
  const result = await store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update });
  equal(result.case.updates.map(u => u.revision), [1, 2, 3]); equal(result.update.occurredAt, '2019-12-01'); equal(result.update.recordedAt, update.recordedAt); equal(result.idempotent, false);
});

test('same publication ID is safely retried but cannot be reused to rewrite an edition', async () => {
  await seed(); const update = next(); await store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update });
  const again = await store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update }); equal(again.idempotent, true); equal(count('case_updates'), 5);
  await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 3, update: { ...update, change: 'Ændret udgave under samme ID.' } }), 'revision_conflict');
});

test('optimistic concurrency accepts only one of two editors using the same revision', async () => {
  await seed();
  const results = await Promise.allSettled([
    store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next({ id: 'editor-a' }) }),
    store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next({ id: 'editor-b', change: 'En anden gennemgang af beslutningen.' }) }),
  ]);
  equal(results.filter(r => r.status === 'fulfilled').length, 1); equal(results.filter(r => r.status === 'rejected' && r.reason.code === 'revision_conflict').length, 1); equal((await store.readCase(db, 'bus-route')).updates.length, 3);
});

test('corrections preserve the original edition and must identify an earlier update', async () => {
  await seed(); const update = next({ id: 'correction', kind: 'correction', correctsUpdateId: 'proposal', change: 'Den oprindelige formulering er præciseret ud fra referatet.' });
  const saved = await store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update });
  equal(saved.case.updates[0], catalog[0].updates[0]); equal(saved.update.correctsUpdateId, 'proposal');
  await rejects(() => store.appendCaseUpdate(db, { caseId: 'global-case', expectedRevision: 2, update: { ...update, correctsUpdateId: 'missing' } }), 'invalid_case_data');
});

test('duplicate developments under a new ID are rejected rather than generating another notification revision', async () => {
  await seed(); const update = next(); await store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update });
  await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 3, update: { ...update, id: 'same-decision-again', revision: 4 } }), 'revision_conflict');
});

test('new evidence is stored permanently and previous source versions are immutable', async () => {
  await seed(); const source = { ...clone(catalog[0].sources[0]), id: 'source-v2', url: 'https://example.org/transport/final', checkedAt: currentTime(), evidence: 'Det endelige referat bekræfter beslutningen.' };
  const update = next({ sourceIds: [source.id] });
  const result = await store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update, sources: [source] });
  equal(result.case.sources.length, 2); equal(result.case.sources.find(s => s.id === 'source-v1'), catalog[0].sources[0]);
  await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 3, update: next({ id: 'other', revision: 4 }), sources: [{ ...source, evidence: 'Overskriv forsøget.' }] }), 'revision_conflict');
});

test('unsafe source URLs, unapproved hosts and missing source references fail before any write', async () => {
  await seed(); const total = count('case_updates');
  for (const url of ['http://example.org/x', 'https://reader:secret@example.org/x', 'https://127.0.0.1/x', 'https://2130706433/x', 'https://example.org.evil.net/x', 'https://example.org:8443/x']) {
    await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next(), sources: [{ ...catalog[0].sources[0], id: 'new-source', url }] }), 'invalid_case_data');
  }
  await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next({ sourceIds: ['unseen'] }) }), 'invalid_case_data');
  const update = next(); update.snapshot.nextStep = { label: 'En bestemt dato kræver en kilde.', expectedAt: '2030-01-01', sourceIds: [] };
  await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update }), 'invalid_case_data');
  equal(count('case_updates'), total);
});

test('an atomic database failure leaves no partial new update, source or revision pointer', async () => {
  await seed();
  sqlite.exec("CREATE TRIGGER test_source_failure BEFORE INSERT ON case_sources WHEN NEW.source_id='blocked' BEGIN SELECT RAISE(ABORT,'isolated test failure'); END");
  const source = { ...catalog[0].sources[0], id: 'blocked', url: 'https://example.org/new' };
  assertions++; await assert.rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next({ sourceIds: ['blocked'] }), sources: [source] }));
  equal((await store.readCase(db, 'bus-route')).updates.length, 2); equal(count('case_sources'), 2); equal(sqlite.prepare("SELECT current_revision FROM news_cases WHERE id='bus-route'").get().current_revision, 2);
});

test('unavailable and pending checks persist honestly without altering editorial facts or revision', async () => {
  await seed(); const before = await store.readCase(db, 'bus-route'), now = currentTime();
  const check = { checkedAt: now, status: 'unavailable', note: 'Kilden kunne ikke kontrolleres; udviklingen er ukendt.', sourceIds: [] };
  equal((await store.recordCaseCheck(db, { caseId: 'bus-route', check })).idempotent, false);
  equal((await store.recordCaseCheck(db, { caseId: 'bus-route', check })).idempotent, true);
  const pending = { checkedAt: now, status: 'pending_review', note: 'Ny dokumentation afventer gennemgang.', sourceIds: ['source-v1'] };
  await store.recordCaseCheck(db, { caseId: 'bus-route', check: pending });
  const saved = await store.readCase(db, 'bus-route'); equal(saved.updates, before.updates); equal(saved.lastCheck, pending); equal(count('case_checks'), 4);
  const old = { ...check, checkedAt: '2019-01-01T00:00:00.000Z' }; await store.recordCaseCheck(db, { caseId: 'bus-route', check: old }); equal((await store.readCase(db, 'bus-route')).lastCheck, pending);
});

test('review queue is due by interval and does not infer outcomes from a passed milestone', async () => {
  const custom = clone(catalog); custom[0].updates[1].snapshot.nextStep.expectedAt = '2020-03-02';
  await seed(custom); const queue = await store.readEditorialQueue(db, '2020-03-03T00:00:00.000Z');
  equal(queue.length, 2); ok(queue.every(c => c.isDue)); equal(queue.find(c => c.caseId === 'bus-route').status, 'awaiting');
});

test('invalid catalog references, malformed dates and non-contiguous revisions cannot seed any records', async () => {
  const cases = [clone(catalog), clone(catalog), clone(catalog)]; cases[0][0].updates[1].revision = 4; cases[1][0].sources[0].publishedAt = '2020-02-30'; cases[2][0].updates[1].sourceIds = ['missing'];
  for (const broken of cases) { await rejects(() => seed(broken), 'invalid_case_data'); equal(count('news_cases'), 0); }
});

test('IDs rejected by the reader cannot enter persisted case, source or update records', async () => {
  const invalidIds = ['Uppercase', 'with.dot', 'with_underscore', 'with:colon', '-leading', 'constructor', 'prototype', 'a'.repeat(101)];
  for (const value of invalidIds) {
    const broken = clone(catalog); broken[0].id = value;
    await rejects(() => seed(broken), 'invalid_case_data');
    equal(count('news_cases'), 0);
  }
  await seed();
  for (const value of invalidIds) {
    await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next({ id: value }) }), 'invalid_case_data');
    await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update: next(), sources: [{ ...catalog[0].sources[0], id: value }] }), 'invalid_case_data');
  }
  equal(count('case_updates'), 4); equal(count('case_sources'), 2);
});

test('array enum lookalikes cannot poison the persisted reader contract', async () => {
  for (const field of ['scope', 'imageKey']) {
    const broken = clone(catalog); broken[0][field] = [broken[0][field]];
    await rejects(() => seed(broken), 'invalid_case_data'); equal(count('news_cases'), 0);
  }
  await seed();
  const wrongKind = next({ kind: ['decision'] });
  const wrongStatus = next(); wrongStatus.snapshot.status = ['active'];
  for (const update of [wrongKind, wrongStatus]) await rejects(() => store.appendCaseUpdate(db, { caseId: 'bus-route', expectedRevision: 2, update }), 'invalid_case_data');
  await rejects(() => store.recordCaseCheck(db, { caseId: 'bus-route', check: { checkedAt: currentTime(), status: ['checked'], note: 'Invalid type.', sourceIds: ['source-v1'] } }), 'invalid_case_data');
  equal(count('case_updates'), 4); equal(count('case_checks'), 2);
});

test('reader accepts the backend source capacity, reference and editorial text boundaries', async () => {
  const item = fixture();
  item.sources.push(...Array.from({ length: 199 }, (_, index) => ({ ...clone(item.sources[0]), id: `source-extra-${index}`, url: `https://example.org/evidence/${index}` })));
  await seed([item]);
  const refs = item.sources.slice(0, 40).map(source => source.id);
  const update = next({ id: 'a'.repeat(100), change: 'x'.repeat(4000), sourceIds: refs });
  update.snapshot.answer = 'x'.repeat(4000); update.snapshot.nextStep.sourceIds = refs;
  const saved = await store.appendCaseUpdate(db, { caseId: item.id, expectedRevision: 2, update });
  equal(saved.case.sources.length, 200);
  ok(reader.isTrackedCase(saved.case), 'Every successfully stored case must remain readable by the frontend validator');
  const response = { cases: [saved.case], generatedAt: currentTime(), storage: 'database', monitoring: { state: 'manual', label: 'Manuel kontrol.' } };
  ok(reader.parseCasesResponse(response));
  await rejects(() => store.appendCaseUpdate(db, { caseId: item.id, expectedRevision: 3, update: next({ id: 'one-more', revision: 4 }), sources: [{ ...item.sources[0], id: 'over-capacity' }] }), 'source_capacity');
});

test('public API returns database history and accurate monitoring state without public write handlers', async () => {
  const request = new Request('https://siden-sidst.test/api/cases', { headers: { Origin: 'https://drdur88.github.io' } });
  const response = await route.GET(request), body = await response.json();
  equal(response.status, 200); equal(body.storage, 'database'); equal(body.cases.length, 2); equal(body.monitoring.state, 'manual'); equal(response.headers.get('access-control-allow-origin'), 'https://drdur88.github.io');
  equal(route.POST, undefined); equal(route.PUT, undefined); equal(route.DELETE, undefined);
  env.CASE_MONITORING_ENABLED = 'true'; equal((await (await route.GET(request)).json()).monitoring.state, 'scheduled');
  const lookalike = await route.GET(new Request(request.url, { headers: { Origin: 'https://another.github.io' } })); equal(lookalike.headers.get('access-control-allow-origin'), null);
});

test('cases preflight allows only the trusted read origin and GET method', async () => {
  function request(origin, method) { return new Request('https://siden-sidst.test/api/cases', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': method } }); }
  equal(route.OPTIONS(request('https://drdur88.github.io', 'GET')).status, 204); equal(route.OPTIONS(request('https://drdur88.github.io', 'POST')).status, 405); equal(route.OPTIONS(request('https://another.github.io', 'GET')).status, 403); equal(count('news_cases'), 0);
});

test('missing database never produces falsely fresh catalog content', async () => {
  delete env.DB; const response = await route.GET(new Request('https://siden-sidst.test/api/cases')); equal(response.status, 503); const body = await response.json(); equal(body.cases, undefined); ok(typeof body.error === 'string');
});

test('the deployed source-backed catalog validates and persists its supplied historical review times', async () => {
  const actualBuild = await build({
    stdin: { contents: "export * as store from './app/lib/case-store.ts'; export { CASE_CATALOG } from './app/lib/case-catalog.ts';", resolveDir: project, sourcefile: 'real-case-catalog-tests.ts', loader: 'ts' },
    bundle: true, platform: 'node', target: 'node24', format: 'esm', write: false, logLevel: 'silent',
  });
  const actual = await import(`data:text/javascript;base64,${Buffer.from(actualBuild.outputFiles[0].text).toString('base64')}`);
  await actual.store.ensureCaseCatalog(db);
  const saved = await actual.store.readCases(db);
  equal(saved.length, actual.CASE_CATALOG.length);
  equal(count('case_updates'), actual.CASE_CATALOG.reduce((n, c) => n + c.updates.length, 0));
  equal(count('case_sources'), actual.CASE_CATALOG.reduce((n, c) => n + c.sources.length, 0));
  for (const item of saved) {
    const original = actual.CASE_CATALOG.find(c => c.id === item.id);
    equal(item.updates.map(u => [u.id, u.revision, u.occurredAt, u.recordedAt]), original.updates.map(u => [u.id, u.revision, u.occurredAt, new Date(u.recordedAt).toISOString()]));
    equal(item.lastCheck?.checkedAt, original.lastCheck ? new Date(original.lastCheck.checkedAt).toISOString() : undefined);
    equal(item.lastCheck?.status, original.lastCheck?.status);
  }
  await actual.store.ensureCaseCatalog(db);
  equal(await actual.store.readCases(db), saved);
});

for (const entry of tests) {
  try { reset(); await entry.run(); passed++; console.log(`PASS ${entry.name}`); }
  catch (error) { failures.push({ name: entry.name, error: error.stack || String(error) }); console.error(`FAIL ${entry.name}\n${error.stack || error}`); }
}
sqlite?.close(); delete globalThis.__SIDEN_CASE_STORE_ENV__;
console.log(JSON.stringify({ passed, failed: failures.length, assertions, migrations: migrationNames, limitations: 'Real SQL + isolated SQLite adapter; not distributed D1, Cloudflare identity, HTTP routing, editorial truth or live sources.' }));
if (failures.length) process.exitCode = 1;
