/**
 * Adapter-based regression tests for the REAL Siden sidst API route handlers.
 * No server, network, browser, production database, or app-source mutation.
 * The installed esbuild bundles the TypeScript routes; node:sqlite supplies
 * a small D1-compatible adapter and applies the project's real migrations.
 * This does not emulate Cloudflare dispatch, its trusted headers, or Vinext
 * routing. It does exercise handler validation, SQL, response contracts,
 * consent, receipts, deletion boundaries, and rate-limit logic together.
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(project, 'package.json'));
const { build } = require('esbuild');
const origin = 'https://siden-sidst.test';
const env = {};
globalThis.__SIDEN_SIDST_API_TEST_ENV__ = env;
let sqlite;
let passed = 0;
let assertions = 0;
const failures = [];
const testCases = [];

class D1Statement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) { return new D1Statement(this.db, this.sql, values); }
  async run() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  async first(column) {
    const result = this.db.prepare(this.sql).get(...this.values);
    if (!result) return null;
    return column === undefined ? result : result[column];
  }
  async all() {
    return { success: true, results: this.db.prepare(this.sql).all(...this.values), meta: { changes: 0 } };
  }
}
class SqliteD1 {
  constructor(db) { this.db = db; }
  prepare(sql) { return new D1Statement(this.db, sql); }
  async batch(statements) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(statement => {
        const query = this.db.prepare(statement.sql);
        if (query.columns().length) return { success: true, results: query.all(...statement.values), meta: { changes: 0 } };
        const result = query.run(...statement.values);
        return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      });
      this.db.exec('COMMIT'); return results;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}

const migrationNames = (await readdir(path.join(project, 'drizzle'))).filter(name => name.endsWith('.sql')).sort();
const migrations = await Promise.all(migrationNames.map(name => readFile(path.join(project, 'drizzle', name), 'utf8')));

function reset() {
  sqlite?.close();
  sqlite = new DatabaseSync(':memory:');
  for (const sql of migrations) sqlite.exec(sql);
  env.DB = new SqliteD1(sqlite);
}

const compiled = await build({
  stdin: {
    contents: `import * as subscriptions from './app/api/subscriptions/route.ts';\nimport * as feedback from './app/api/feedback/route.ts';\nimport * as health from './app/api/health/route.ts';\nexport { subscriptions, feedback, health };`,
    resolveDir: project,
    sourcefile: 'siden-sidst-api-test-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  write: false,
  logLevel: 'silent',
  plugins: [{
    name: 'in-memory-d1-test-adapter',
    setup(builder) {
      builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'cloudflare-workers-test', namespace: 'test-environment' }));
      builder.onLoad({ filter: /.*/, namespace: 'test-environment' }, () => ({
        contents: 'export const env = globalThis.__SIDEN_SIDST_API_TEST_ENV__;',
        loader: 'js',
      }));
    },
  }],
});
const handlers = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

function token() { return randomBytes(32).toString('hex'); }
function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function valid(overrides = {}) {
  return { email: 'reader@example.com', consent: true, interests: ['station-2028'], website: '', receiptToken: token(), ...overrides };
}
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message); }
function ok(value, message) { assertions++; assert.ok(value, message); }
function count(table) { return sqlite.prepare(`SELECT count(*) AS total FROM ${table}`).get().total; }
function records(table) { return sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all().map(row => ({ ...row })); }
function subscription(email = 'reader@example.com') {
  const row = sqlite.prepare('SELECT * FROM beta_subscriptions WHERE email = ?').get(email);
  return row ? { ...row } : null;
}

async function call(route, body, method = 'POST', options = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    Origin: origin,
    'cf-connecting-ip': options.ip || '198.51.100.10',
    ...options.headers,
  });
  if (options.noOrigin) headers.delete('Origin');
  const request = new Request(`${origin}/api/${route}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: options.raw ? body : JSON.stringify(body) }),
  });
  const handler = handlers[route]?.[method];
  assert.equal(typeof handler, 'function', `A real ${method} handler must exist for ${route}`);
  const response = await handler(request);
  return { status: response.status, body: response.status === 204 ? null : await response.json(), headers: response.headers };
}

function test(name, run) { testCases.push({ name, run }); }

test('real migrations and health handler work against the SQLite D1 adapter', async () => {
  const result = await call('health', undefined, 'GET');
  equal(result.status, 200);
  equal(result.body.ok, true);
  equal(count('beta_subscriptions'), 0);
  equal(count('beta_feedback'), 0);
});

test('health reports failure when a required case table has not been migrated', async () => {
  sqlite.exec('DROP TABLE case_checks');
  const result = await call('health', undefined, 'GET');
  equal(result.status, 503); equal(result.body.ok, undefined);
});

test('subscription and feedback route modules expose no public read handler', async () => {
  equal(handlers.subscriptions.GET, undefined);
  equal(handlers.feedback.GET, undefined);
});

test('valid registration persists consent, interests, and a hashed receipt', async () => {
  const input = valid({ email: '  Reader+beta@Example.COM  ', interests: ['station-2028', 'station-2028', 'solceller'] });
  const result = await call('subscriptions', input);
  equal(result.status, 202);
  equal(result.body.ok, true);
  equal(result.body.token, input.receiptToken);
  equal(Object.keys(result.body).sort(), ['message', 'ok', 'token']);
  equal(result.headers.get('cache-control'), 'no-store');
  equal(result.headers.get('referrer-policy'), 'no-referrer');
  const row = subscription('reader+beta@example.com');
  ok(row);
  equal(row.verification_status, 'unverified');
  equal(row.consent_version, 'beta-contact-v1-2026-11-10');
  ok(!Number.isNaN(Date.parse(row.consent_at)));
  equal(JSON.parse(row.interests_json), ['station-2028', 'solceller']);
  equal(row.manage_token_hash, hash(input.receiptToken));
  ok(!JSON.stringify(row).includes(input.receiptToken), 'Raw receipt must not be persisted');
});

test('consent must be boolean true', async () => {
  for (const consent of [false, undefined, 'true', 1]) {
    equal((await call('subscriptions', valid({ consent }))).status, 400);
  }
  equal(count('beta_subscriptions'), 0);
});

test('invalid and oversized email input is rejected', async () => {
  for (const email of ['', 'not-an-email', 'a@@example.com', 'name\n@example.com', 'a'.repeat(255) + '@example.com', 42]) {
    equal((await call('subscriptions', valid({ email }))).status, 400);
  }
  equal(count('beta_subscriptions'), 0);
});

test('unknown interests and malformed receipts are rejected', async () => {
  for (const interests of [['unknown'], ['station-2028', 3], 'station-2028', Array(7).fill('station-2028')]) {
    equal((await call('subscriptions', valid({ interests }))).status, 400);
  }
  for (const receiptToken of ['bad', 'A'.repeat(64), 7, null]) {
    equal((await call('subscriptions', valid({ receiptToken }))).status, 400);
  }
  equal(count('beta_subscriptions'), 0);
});

test('retry with the persisted client receipt preserves exactly one registration', async () => {
  const input = valid();
  equal((await call('subscriptions', input)).status, 202);
  const before = subscription();
  // Ignore the first response as if transport had dropped it, then retry.
  const retried = await call('subscriptions', input);
  equal(retried.status, 202);
  equal(retried.body.token, input.receiptToken);
  equal(subscription(), before);
  equal(count('beta_subscriptions'), 1);
  equal((await call('subscriptions', { token: input.receiptToken }, 'DELETE')).status, 200);
  equal(count('beta_subscriptions'), 0);
});

test('duplicate email neither reveals nor changes the existing registration', async () => {
  const original = valid();
  await call('subscriptions', original);
  const before = subscription();
  const replacement = valid({ email: '  READER@EXAMPLE.COM ', interests: ['solceller'] });
  const result = await call('subscriptions', replacement);
  equal(result.status, 202);
  equal(result.body.token, replacement.receiptToken);
  ok(result.body.token !== original.receiptToken);
  equal(Object.keys(result.body).sort(), ['message', 'ok', 'token']);
  equal(subscription(), before);
  equal(count('beta_subscriptions'), 1);
  equal((await call('subscriptions', { token: replacement.receiptToken }, 'DELETE')).status, 404);
  equal(subscription(), before);
  equal((await call('subscriptions', { token: original.receiptToken }, 'DELETE')).status, 200);
});

test('an email address and arbitrary receipt cannot delete another registration', async () => {
  const first = valid();
  const second = valid({ email: 'second@example.com' });
  await call('subscriptions', first);
  await call('subscriptions', second);
  const before = records('beta_subscriptions');
  equal((await call('subscriptions', { email: first.email }, 'DELETE')).status, 400);
  equal((await call('subscriptions', { token: token(), email: first.email }, 'DELETE')).status, 404);
  equal((await call('subscriptions', { token: 'bad' }, 'DELETE')).status, 400);
  equal(records('beta_subscriptions'), before);
  const secondBefore = subscription(second.email);
  equal((await call('subscriptions', { token: first.receiptToken }, 'DELETE')).status, 200);
  equal(subscription(), null);
  equal(subscription(second.email), secondBefore);
  equal((await call('subscriptions', { token: first.receiptToken }, 'DELETE')).status, 404);
  equal((await call('subscriptions', { token: second.receiptToken }, 'DELETE')).status, 200);
  equal(count('beta_subscriptions'), 0);
});

test('a duplicate request without consent cannot alter previous consent', async () => {
  const original = valid();
  await call('subscriptions', original);
  const before = subscription();
  equal((await call('subscriptions', { ...original, consent: false })).status, 400);
  equal(subscription(), before);
});

test('subscription honeypot has no persistent registration side effect', async () => {
  equal((await call('subscriptions', valid({ website: 'filled-by-a-bot' }))).status, 202);
  equal(count('beta_subscriptions'), 0);
});

test('valid feedback persists without an email association', async () => {
  const input = { clarity: 4, wouldReturn: 'maybe', comment: '  Need clearer sources.  ', storyId: 'station-2028', email: 'ignored@example.com' };
  const result = await call('feedback', input);
  equal(result.status, 201);
  equal(result.body.ok, true);
  const [row] = records('beta_feedback');
  equal(row.clarity, 4);
  equal(row.would_return, 'maybe');
  equal(row.comment, 'Need clearer sources.');
  equal(row.story_id, 'station-2028');
  ok(!Object.hasOwn(row, 'email'));
  ok(!JSON.stringify(row).includes(input.email));
});

test('feedback validates rating, return choice, comment length, and story ID', async () => {
  const base = { clarity: 4, wouldReturn: 'yes', comment: '', storyId: 'station-2028' };
  for (const clarity of [0, 6, 3.5, '4']) equal((await call('feedback', { ...base, clarity })).status, 400);
  equal((await call('feedback', { ...base, wouldReturn: 'unknown' })).status, 400);
  equal((await call('feedback', { ...base, comment: 'a'.repeat(1501) })).status, 400);
  equal((await call('feedback', { ...base, storyId: 'unknown' })).status, 400);
  equal(count('beta_feedback'), 0);
});

test('feedback honeypot has no persistent feedback side effect', async () => {
  equal((await call('feedback', { clarity: 5, wouldReturn: 'yes', website: 'spam' })).status, 201);
  equal(count('beta_feedback'), 0);
});

test('large request body is rejected before writing data', async () => {
  equal((await call('feedback', { clarity: 4, wouldReturn: 'yes', comment: 'a'.repeat(9000) })).status, 413);
  equal(count('beta_feedback'), 0);
  equal(count('rate_limits'), 0);
});

test('malformed JSON, non-object bodies, empty bodies, and wrong content types fail', async () => {
  equal((await call('subscriptions', '{broken', 'POST', { raw: true })).status, 400);
  equal((await call('subscriptions', [], 'POST')).status, 400);
  equal((await call('subscriptions', null, 'POST')).status, 400);
  equal((await call('subscriptions', undefined, 'POST')).status, 400);
  equal((await call('subscriptions', valid(), 'POST', { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  equal(count('beta_subscriptions'), 0);
});

test('cross-origin and cross-site browser writes are rejected', async () => {
  equal((await call('subscriptions', valid(), 'POST', { headers: { Origin: 'https://unrelated.example' } })).status, 403);
  equal((await call('feedback', { clarity: 4, wouldReturn: 'yes' }, 'POST', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  equal((await call('subscriptions', { token: token() }, 'DELETE', { headers: { Origin: 'https://unrelated.example' } })).status, 403);
  equal(count('beta_subscriptions'), 0);
  equal(count('beta_feedback'), 0);
  equal(count('rate_limits'), 0);
});

test('verified GitHub Pages origin can preflight every supported public write', async () => {
  for (const [route, method] of [['subscriptions', 'POST'], ['subscriptions', 'DELETE'], ['feedback', 'POST']]) {
    const result = await call(route, undefined, 'OPTIONS', { headers: {
      Origin: 'https://drdur88.github.io',
      'Sec-Fetch-Site': 'cross-site',
      'Access-Control-Request-Method': method,
      'Access-Control-Request-Headers': 'content-type',
    } });
    equal(result.status, 204);
    equal(result.body, null);
    equal(result.headers.get('access-control-allow-origin'), 'https://drdur88.github.io');
    ok(result.headers.get('access-control-allow-methods').split(', ').includes(method));
    equal(result.headers.get('access-control-allow-headers'), 'Content-Type');
    equal(result.headers.get('access-control-allow-credentials'), null);
    equal(result.headers.get('access-control-max-age'), '600');
    ok(result.headers.get('vary').includes('Origin'));
    equal(result.headers.get('cache-control'), 'no-store');
  }
  equal(count('beta_subscriptions'), 0);
  equal(count('beta_feedback'), 0);
  equal(count('rate_limits'), 0);
});

test('GitHub Pages registration, feedback and token deletion preserve the existing contracts', async () => {
  const options = { headers: { Origin: 'https://drdur88.github.io', 'Sec-Fetch-Site': 'cross-site' } };
  const input = valid({ interests: [] });
  const created = await call('subscriptions', input, 'POST', options);
  equal(created.status, 202);
  equal(created.body.token, input.receiptToken);
  equal(subscription().manage_token_hash, hash(input.receiptToken));
  equal(subscription().verification_status, 'unverified');
  const feedback = await call('feedback', { clarity: 5, wouldReturn: 'yes', comment: '', storyId: null }, 'POST', options);
  equal(feedback.status, 201);
  equal(count('beta_feedback'), 1);
  const deleted = await call('subscriptions', { token: input.receiptToken }, 'DELETE', options);
  equal(deleted.status, 200);
  equal(count('beta_subscriptions'), 0);
  for (const result of [created, feedback, deleted]) {
    equal(result.headers.get('access-control-allow-origin'), 'https://drdur88.github.io');
    equal(result.headers.get('access-control-allow-credentials'), null);
    equal(result.headers.get('vary'), 'Origin');
    equal(result.headers.get('cache-control'), 'no-store');
  }
});

test('the exact origin allowlist rejects other Pages accounts, lookalikes and null origins', async () => {
  for (const deniedOrigin of ['https://other.github.io', 'https://ronird.github.io', 'https://drdur88.github.io.evil.example', 'http://drdur88.github.io', 'https://sub.drdur88.github.io', 'https://drdur88.github.io/siden-sidst/', 'null']) {
    const options = { headers: { Origin: deniedOrigin, 'Sec-Fetch-Site': 'cross-site', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } };
    for (const method of ['OPTIONS', 'POST']) {
      const result = await call('subscriptions', method === 'POST' ? valid() : undefined, method, options);
      equal(result.status, 403);
      equal(result.headers.get('access-control-allow-origin'), null);
    }
  }
  equal(count('beta_subscriptions'), 0);
  equal(count('rate_limits'), 0);
});

test('preflight rejects unapproved methods and headers without consuming rate limits', async () => {
  const base = { Origin: 'https://drdur88.github.io', 'Sec-Fetch-Site': 'cross-site', 'Access-Control-Request-Headers': 'content-type' };
  equal((await call('subscriptions', undefined, 'OPTIONS', { headers: { ...base, 'Access-Control-Request-Method': 'PATCH' } })).status, 405);
  equal((await call('feedback', undefined, 'OPTIONS', { headers: { ...base, 'Access-Control-Request-Method': 'DELETE' } })).status, 405);
  equal((await call('subscriptions', undefined, 'OPTIONS', { headers: { ...base, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type, authorization' } })).status, 403);
  equal((await call('subscriptions', undefined, 'OPTIONS', { noOrigin: true, headers: { 'Access-Control-Request-Method': 'POST' } })).status, 403);
  equal((await call('subscriptions', valid(), 'POST', { noOrigin: true, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  equal(count('beta_subscriptions'), 0);
  equal(count('rate_limits'), 0);
});

test('validation, server and rate-limit errors remain readable by the trusted frontend', async () => {
  const options = { headers: { Origin: 'https://drdur88.github.io', 'Sec-Fetch-Site': 'cross-site' } };
  const invalid = await call('subscriptions', valid({ consent: false }), 'POST', options);
  equal(invalid.status, 400);
  const savedDb = env.DB;
  env.DB = undefined;
  const unavailable = await call('feedback', { clarity: 5, wouldReturn: 'yes' }, 'POST', options);
  env.DB = savedDb;
  equal(unavailable.status, 503);
  for (let i = 0; i < 10; i++) equal((await call('feedback', { clarity: 5, wouldReturn: 'yes' }, 'POST', options)).status, 201);
  const limited = await call('feedback', { clarity: 5, wouldReturn: 'yes' }, 'POST', options);
  equal(limited.status, 429);
  for (const result of [invalid, unavailable, limited]) {
    equal(result.headers.get('access-control-allow-origin'), 'https://drdur88.github.io');
    equal(result.headers.get('access-control-allow-credentials'), null);
    ok(result.body.error);
    ok(!result.body.ok);
  }
  equal(count('beta_subscriptions'), 0);
});

test('same-origin browser and non-browser clients retain their existing behavior', async () => {
  const sameOrigin = await call('subscriptions', valid());
  equal(sameOrigin.status, 202);
  equal(sameOrigin.headers.get('access-control-allow-origin'), origin);
  const nonBrowser = await call('feedback', { clarity: 4, wouldReturn: 'yes' }, 'POST', { noOrigin: true });
  equal(nonBrowser.status, 201);
  equal(nonBrowser.headers.get('access-control-allow-origin'), null);
});

test('subscription rate limit is enforced after twelve requests per IP bucket', async () => {
  const input = valid();
  for (let i = 0; i < 12; i++) equal((await call('subscriptions', input)).status, 202);
  equal((await call('subscriptions', input)).status, 429);
  equal(count('beta_subscriptions'), 1);
  equal((await call('subscriptions', valid({ email: 'other@example.com' }), 'POST', { ip: '198.51.100.11' })).status, 202);
  equal(count('beta_subscriptions'), 2);
  equal((await call('feedback', { clarity: 4, wouldReturn: 'yes' })).status, 201, 'Different API route must have its own limit');
});

test('feedback rate limit rejects request eleven without saving it', async () => {
  for (let i = 0; i < 10; i++) equal((await call('feedback', { clarity: 4, wouldReturn: 'yes' })).status, 201);
  equal((await call('feedback', { clarity: 4, wouldReturn: 'yes' })).status, 429);
  equal(count('beta_feedback'), 10);
});

test('deletion rate limit stops guessed-token attempts', async () => {
  await call('subscriptions', valid());
  for (let i = 0; i < 15; i++) equal((await call('subscriptions', { token: token() }, 'DELETE')).status, 404);
  equal((await call('subscriptions', { token: token() }, 'DELETE')).status, 429);
  equal(count('beta_subscriptions'), 1);
});

test('expired rate-limit rows are removed and raw IPs are not stored', async () => {
  sqlite.prepare('INSERT INTO rate_limits (key, count, expires_at) VALUES (?, ?, ?)').run('expired-test', 999, Math.floor(Date.now() / 1000) - 1);
  await call('subscriptions', valid());
  const rows = sqlite.prepare('SELECT * FROM rate_limits').all();
  equal(rows.length, 1);
  ok(/^[a-f0-9]{64}$/.test(rows[0].key));
  ok(!JSON.stringify(rows).includes('198.51.100.10'));
  equal(rows[0].count, 1);
});

test('missing D1 binding produces errors rather than false successful writes', async () => {
  env.DB = undefined;
  const registration = await call('subscriptions', valid());
  const feedback = await call('feedback', { clarity: 4, wouldReturn: 'yes' });
  equal(registration.status, 503);
  equal(feedback.status, 503);
  ok(registration.body.error);
  ok(feedback.body.error);
  ok(!registration.body.ok);
  ok(!feedback.body.ok);
  equal(count('beta_subscriptions'), 0);
  equal(count('beta_feedback'), 0);
});

console.log('Siden sidst — adapter-based route/SQLite integration checks');
console.log(`Real migrations applied per isolated case: ${migrationNames.join(', ')}`);
for (const { name, run } of testCases) {
  reset();
  try { await run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
sqlite?.close();
delete globalThis.__SIDEN_SIDST_API_TEST_ENV__;
console.log(JSON.stringify({ passed, failed: failures.length, assertions, failures,
  limitations: 'Handler + SQL adapter tests only; no Vinext HTTP routing, browser UI, Cloudflare deployment, edge rate-limit header guarantees, or real D1 distributed behavior were exercised.' }, null, 2));
if (failures.length) process.exitCode = 1;
