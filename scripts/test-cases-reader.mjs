/** The reader's checkpoint contract: no server, account, browser or network required. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(project, 'package.json'));
const { build } = require('esbuild');
const compiled = await build({ stdin: { contents: "export * from './app/lib/case-reader.ts'; export { CASE_CATALOG } from './app/lib/case-catalog.ts';", resolveDir: project, sourcefile: 'case-reader-test-entry.ts', loader: 'ts' }, bundle: true, platform: 'node', target: 'node24', format: 'esm', write: false, logLevel: 'silent' });
const reader = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const checks = [];
function test(name, run) { checks.push({ name, run }); }
const at = '2026-11-11T10:00:00.000Z';
const empty = () => ({ version: 1, cases: {} });
const clone = value => structuredClone(value);
function fixture(length = 3, id = 'transport-case') {
  const sources = [{ id: 'official-report', title: 'A published report', publisher: 'The responsible authority', url: 'https://www.example.com/published-report', publishedAt: '2026-10-20', checkedAt: at, evidence: 'The source supports the documented status.' }];
  const updates = Array.from({ length }, (_, index) => ({ id: `update-${index + 1}`, revision: index + 1, kind: index ? 'development' : 'background', title: `Development ${index + 1}`, change: `Documented change ${index + 1}`, whyItMatters: 'Explains the significance without predicting an outcome.', occurredAt: `2026-10-${String(index + 20).padStart(2, '0')}`, recordedAt: at, sourceIds: ['official-report'], snapshot: { status: 'awaiting', answer: `Current answer at version ${index + 1}`, openQuestions: ['What happens next?'], nextStep: { label: 'A documented next step', expectedAt: null, sourceIds: ['official-report'] } } }));
  return { id, question: 'When will the next part open?', description: 'A finite question with a traceable history.', topics: ['samfund'], region: 'danmark', scope: 'national', imageKey: 'mobility', sources, updates, monitoring: { sourceUrls: ['https://www.example.com/published-report'], keywords: ['next part'], reviewEveryHours: 24 }, lastCheck: { checkedAt: at, status: 'checked', note: 'Reviewed the named source.', sourceIds: ['official-report'] } };
}
const response = cases => ({ cases, generatedAt: at, storage: 'database', monitoring: { state: 'manual', label: 'Editorial follow-up; last checks shown on each case.' } });
function caughtUp(item) {
  let profile = reader.followCase(empty(), item, at);
  profile = reader.markCaseOpened(profile, item, reader.latestCaseUpdate(item).revision);
  return reader.acknowledgeCase(profile, item, reader.latestCaseUpdate(item).revision);
}

// The same story must lead to a different, correct continuation for each reader.
test('two readers of one case have independent catch-up points', () => {
  const first = caughtUp(fixture(1)), second = caughtUp(fixture(2)), current = fixture(3);
  assert.deepEqual(reader.caseNewUpdates(current, first.cases[current.id]).map(x => x.revision), [2, 3]);
  assert.deepEqual(reader.caseNewUpdates(current, second.cases[current.id]).map(x => x.revision), [3]);
  assert.equal(first.cases[current.id].acknowledgedRevision, 1);
  assert.equal(second.cases[current.id].acknowledgedRevision, 2);
});

test('following starts with a current briefing, never labels all old history as new', () => {
  const item = fixture(3), profile = reader.followCase(empty(), item, at), progress = profile.cases[item.id];
  assert.equal(progress.followedRevision, 3);
  assert.equal(progress.acknowledgedRevision, 0);
  assert.equal(progress.seenRevision, 0);
  assert.equal(progress.openedRevision, 0);
  assert.equal(reader.caseNeedsAttention(item, progress), true);
  assert.deepEqual(reader.caseNewUpdates(item, progress), []);
  assert.deepEqual(reader.caseNewUpdates(fixture(4), progress).map(x => x.revision), [4]);
});

test('display, opening, persistence and reload do not implicitly acknowledge updates', () => {
  const item = fixture(3), initial = caughtUp(fixture(1));
  const shown = reader.markCaseShown(initial, item, 3);
  assert.equal(shown.cases[item.id].seenRevision, 3);
  assert.equal(shown.cases[item.id].openedRevision, 1);
  assert.equal(shown.cases[item.id].acknowledgedRevision, 1);
  const opened = reader.markCaseOpened(shown, item, 3);
  const reloaded = reader.normalizeCaseReader(JSON.parse(JSON.stringify(opened)));
  assert.equal(reloaded.cases[item.id].openedRevision, 3);
  assert.equal(reloaded.cases[item.id].acknowledgedRevision, 1);
  assert.deepEqual(reader.caseNewUpdates(item, reloaded.cases[item.id]).map(x => x.revision), [2, 3]);
  assert.equal(initial.cases[item.id].seenRevision, 1, 'original visit snapshot must remain immutable');
});

test('acknowledgement is explicit and requires the exact version to have been opened', () => {
  const item = fixture(3), original = reader.followCase(empty(), item, at);
  assert.equal(reader.acknowledgeCase(original, item, 3), original);
  const shown = reader.markCaseShown(original, item, 3);
  assert.equal(reader.acknowledgeCase(shown, item, 3), shown);
  const opened = reader.markCaseOpened(shown, item, 3);
  const acknowledged = reader.acknowledgeCase(opened, item, 3);
  assert.equal(acknowledged.cases[item.id].acknowledgedRevision, 3);
  assert.equal(reader.caseNeedsAttention(item, acknowledged.cases[item.id]), false);
  assert.equal(reader.acknowledgeCase(acknowledged, item, 2), acknowledged, 'cannot move the checkpoint backward');
});

test('a new edition arriving while an older detail is open remains unread', () => {
  const openedEdition = fixture(2), newestEdition = fixture(3);
  let profile = caughtUp(fixture(1));
  profile = reader.markCaseOpened(profile, openedEdition, 2);
  assert.equal(reader.acknowledgeCase(profile, newestEdition, 3), profile, 'latest fetched is not latest opened');
  profile = reader.acknowledgeCase(profile, openedEdition, 2);
  assert.equal(profile.cases[openedEdition.id].acknowledgedRevision, 2);
  assert.deepEqual(reader.caseNewUpdates(newestEdition, profile.cases[openedEdition.id]).map(x => x.revision), [3]);
});

test('an exact older shown revision cannot accidentally mark the latest edition shown', () => {
  const item = fixture(3), profile = reader.followCase(empty(), fixture(1), at);
  const next = reader.markCaseShown(profile, item, 2);
  assert.equal(next.cases[item.id].seenRevision, 2);
  assert.equal(next.cases[item.id].openedRevision, 0);
  assert.equal(reader.markCaseShown(next, item, 900), next);
  assert.equal(reader.markCaseOpened(next, item, -1), next);
  assert.equal(reader.acknowledgeCase(next, item, 900), next);
});

test('a late-recorded old event and a correction remain new by revision, not event date', () => {
  const item = fixture(3), profile = caughtUp(fixture(1));
  item.updates[1].occurredAt = '2020-01-01';
  item.updates[2] = { ...item.updates[2], kind: 'correction', correctsUpdateId: 'update-1', occurredAt: '2019-01-01', title: 'Corrected source detail' };
  assert.ok(reader.isTrackedCase(item));
  assert.equal(reader.latestCaseUpdate(item).revision, 3);
  assert.deepEqual(reader.caseNewUpdates(item, profile.cases[item.id]).map(x => x.revision), [2, 3]);
  assert.equal(reader.caseNewUpdates(item, profile.cases[item.id])[1].kind, 'correction');
  assert.equal(reader.caseUpdateAt(item, 1).snapshot.answer, 'Current answer at version 1');
});

test('pause hides updates from catch-up while preserving timeline and all checkpoints', () => {
  const item = fixture(3), original = caughtUp(fixture(1));
  const paused = reader.setCaseOptions(original, item.id, { paused: true, priority: 'high' });
  assert.deepEqual(reader.caseNewUpdates(item, paused.cases[item.id]), []);
  assert.equal(reader.caseNeedsAttention(item, paused.cases[item.id]), false);
  assert.equal(item.updates.length, 3);
  assert.equal(paused.cases[item.id].acknowledgedRevision, 1);
  const resumed = reader.setCaseOptions(paused, item.id, { paused: false });
  assert.deepEqual(reader.caseNewUpdates(item, resumed.cases[item.id]).map(x => x.revision), [2, 3]);
  assert.equal(resumed.cases[item.id].priority, 'high');
  assert.equal(original.cases[item.id].priority, 'normal');
});

test('unfollow is explicit, keeps catalog history and a refollow gets a fresh current briefing', () => {
  const item = fixture(3), previous = caughtUp(fixture(1));
  const next = reader.unfollowCase(previous, item.id);
  assert.equal(Object.keys(next.cases).length, 0);
  assert.equal(reader.caseNeedsAttention(item, next.cases[item.id]), false);
  assert.equal(item.updates.length, 3);
  const refollowed = reader.followCase(next, item, at);
  assert.equal(refollowed.cases[item.id].followedRevision, 3);
  assert.equal(refollowed.cases[item.id].acknowledgedRevision, 0);
  assert.deepEqual(reader.caseNewUpdates(item, refollowed.cases[item.id]), []);
  assert.equal(reader.followCase(refollowed, item, at), refollowed, 'repeated follow is idempotent');
});

test('an unfollowed visit stores no tracking state and makes no silent subscription', () => {
  const item = fixture(3), original = empty();
  assert.equal(reader.markCaseShown(original, item, 3), original);
  assert.equal(reader.markCaseOpened(original, item, 3), original);
  assert.equal(reader.acknowledgeCase(original, item, 3), original);
  assert.equal(reader.setCaseOptions(original, item.id, { priority: 'high' }), original);
  assert.equal(Object.keys(original.cases).length, 0);
});

test('exports whitelist preferences and strip account or arbitrary imported fields', () => {
  const item = fixture(3), profile = caughtUp(item);
  profile.email = 'private@example.com'; profile.token = 'never-export-this';
  profile.cases[item.id].email = 'private@example.com'; profile.cases[item.id].adminToken = 'never-export-this';
  const exported = reader.caseProfileExport(profile);
  assert.deepEqual(Object.keys(exported).sort(), ['cases', 'exportedAt', 'kind', 'product', 'version']);
  assert.ok(!JSON.stringify(exported).includes('private@example.com'));
  assert.ok(!JSON.stringify(exported).includes('never-export-this'));
  assert.deepEqual(reader.caseProfileImport(exported, [item]), caughtUp(item));
});

test('imports bound revisions to the known catalog and preserve shown/opened/acknowledged order', () => {
  const item = fixture(3), exported = reader.caseProfileExport(caughtUp(item));
  exported.cases[item.id] = { ...exported.cases[item.id], followedRevision: 9999, seenRevision: 99, openedRevision: 1000, acknowledgedRevision: 5000, priority: 'administrator', paused: 'true', arbitrary: 'discard' };
  const parsed = reader.caseProfileImport(exported, [item]).cases[item.id];
  assert.equal(parsed.followedRevision, 3);
  assert.equal(parsed.seenRevision, 3);
  assert.equal(parsed.openedRevision, 3);
  assert.equal(parsed.acknowledgedRevision, 3);
  assert.equal(parsed.priority, 'normal');
  assert.equal(parsed.paused, false);
  assert.ok(!Object.hasOwn(parsed, 'arbitrary'));
  exported.cases[item.id].seenRevision = 1;
  assert.equal(reader.caseProfileImport(exported, [item]).cases[item.id].acknowledgedRevision, 1);
});

test('duplicate keys cannot duplicate follows; malformed, unknown and prototype IDs are dropped', () => {
  const item = fixture(3), exported = reader.caseProfileExport(caughtUp(item));
  const progress = exported.cases[item.id];
  const doubled = JSON.parse(`{"product":"Siden sidst","kind":"case-profile","version":1,"cases":{"${item.id}":${JSON.stringify(progress)},"${item.id}":${JSON.stringify(progress)},"__proto__":{"polluted":true},"constructor":${JSON.stringify(progress)}}}`);
  const imported = reader.caseProfileImport(doubled, [item]);
  assert.deepEqual(Object.keys(imported.cases), [item.id]);
  assert.equal({}.polluted, undefined);
  exported.cases.unknown = progress;
  exported.cases['bad-date'] = { ...progress, followedAt: '2026-02-30' };
  assert.deepEqual(Object.keys(reader.caseProfileImport(exported, [item]).cases), [item.id]);
  assert.throws(() => reader.caseProfileImport({ ...exported, product: 'different' }, [item]));
  assert.throws(() => reader.caseProfileImport({ ...exported, cases: { unknown: progress } }, [item]));
  assert.deepEqual(reader.normalizeCaseReader({ version: 1, cases: { 'bad-date': { ...progress, followedAt: '2026-02-30' } } }), empty());
});

test('invalid numbers cannot become destructive read checkpoints', () => {
  const item = fixture(3), exported = reader.caseProfileExport(caughtUp(item));
  for (const invalid of [-1, Infinity, NaN, '3', 2.5, 1_000_001, null]) {
    exported.cases[item.id] = { ...exported.cases[item.id], seenRevision: invalid, openedRevision: invalid, acknowledgedRevision: invalid };
    const imported = reader.caseProfileImport(exported, [item]).cases[item.id];
    assert.equal(imported.seenRevision, 0);
    assert.equal(imported.openedRevision, 0);
    assert.equal(imported.acknowledgedRevision, 0);
  }
});

test('profile normalization and follow controls enforce the 100-case bound', () => {
  const progress = caughtUp(fixture(1)).cases['transport-case'];
  const raw = { version: 1, cases: Object.fromEntries(Array.from({ length: 150 }, (_, index) => [`case-${index}`, { ...progress }])) };
  const normalized = reader.normalizeCaseReader(raw);
  assert.equal(Object.keys(normalized.cases).length, 100);
  assert.equal(reader.followCase(normalized, fixture(1, 'overflow-case'), at), normalized);
});

test('unknown next-step dates remain unknown and passing a date does not change status', () => {
  const item = fixture(3);
  assert.equal(reader.latestCaseUpdate(item).snapshot.nextStep.expectedAt, null);
  item.updates[2].snapshot.nextStep.expectedAt = '2020-01-01';
  assert.ok(reader.isTrackedCase(item));
  assert.equal(reader.latestCaseUpdate(item).snapshot.status, 'awaiting');
  assert.equal(reader.latestCaseUpdate(item).snapshot.nextStep.expectedAt, '2020-01-01');
});

test('the real curated catalog is accepted without replacing source dates', () => {
  assert.ok(reader.CASE_CATALOG.length >= 10);
  const result = reader.parseCasesResponse(response(reader.CASE_CATALOG));
  assert.ok(result, 'every published starter case must meet the browser contract');
  assert.deepEqual(result.cases, reader.CASE_CATALOG);
  assert.equal(result.cases[0].sources[0].checkedAt, reader.CASE_CATALOG[0].sources[0].checkedAt);
});

test('all maximum legal backend source, reference, text and revision bounds remain displayable', () => {
  const item = fixture(1, 'a'.repeat(100));
  item.sources = Array.from({ length: 200 }, (_, index) => ({ ...item.sources[0], id: `source-${index}` }));
  const refs = item.sources.slice(0, 40).map(source => source.id);
  item.updates = Array.from({ length: 500 }, (_, index) => ({ ...clone(item.updates[0]), id: index === 499 ? 'u'.repeat(100) : `u-${index}`, revision: index + 1, occurredAt: null, sourceIds: refs, change: 'C'.repeat(4000), snapshot: { ...clone(item.updates[0].snapshot), answer: 'A'.repeat(4000), openQuestions: Array.from({ length: 12 }, () => 'Q'.repeat(600)), nextStep: { label: 'N'.repeat(1000), expectedAt: null, sourceIds: refs } } }));
  item.lastCheck.sourceIds = refs;
  assert.ok(reader.parseCasesResponse(response([item])));
  item.sources.push({ ...item.sources[0], id: 'source-overflow' });
  assert.equal(reader.parseCasesResponse(response([item])), null);
});

test('malformed catalog snapshots, unsafe links and inconsistent history are rejected', () => {
  const mutations = [
    item => item.sources[0].url = 'javascript:alert(1)',
    item => item.sources[0].url = 'https://user:password@example.com/private',
    item => item.sources.push(clone(item.sources[0])),
    item => item.updates[1].revision = 1,
    item => item.updates.reverse(),
    item => item.updates[2].id = item.updates[0].id,
    item => item.updates[2].sourceIds = ['unknown-source'],
    item => item.updates[2].snapshot.answer = 'A'.repeat(4001),
    item => item.updates[2].change = 'C'.repeat(4001),
    item => item.updates[2].snapshot.status = ['active'],
    item => item.updates[2].kind = ['development'],
    item => item.scope = ['national'],
    item => item.imageKey = ['mobility'],
    item => item.lastCheck.status = ['checked'],
    item => item.updates[2].correctsUpdateId = 'not-in-history',
    item => item.updates[2].recordedAt = '2026-02-30T10:00:00Z',
  ];
  for (const mutate of mutations) {
    const item = fixture(3); mutate(item);
    assert.equal(reader.parseCasesResponse(response([item])), null, String(mutate));
  }
  const invalid = response([fixture(3)]); invalid.monitoring.state = ['scheduled'];
  assert.equal(reader.parseCasesResponse(invalid), null);
  assert.equal(reader.parseCasesResponse(response([fixture(3), fixture(3)])), null);
});

let passed = 0;
for (const { name, run } of checks) {
  try { await run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { process.exitCode = 1; console.error(`FAIL ${name}: ${error.stack}`); }
}
console.log(`${passed}/${checks.length} case-reader checks passed. Browser visibility and live API operation are checked separately.`);
