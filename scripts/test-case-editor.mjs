import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'package.json'));
const { build } = require('esbuild');
const state = { env: { CASE_EDITOR_USER_ID: 'trusted-editor' }, writes: [], seeds: 0 };
globalThis.__CASE_EDITOR_TEST__ = state;
const compiled = await build({ entryPoints: [resolve(root, 'app/mcp/route.ts')], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node24', logLevel: 'silent', plugins: [{ name: 'editor-boundary-fixtures', setup(b) {
  b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'env', namespace: 'fixture' }));
  b.onResolve({ filter: /\/lib\/case-store$/ }, () => ({ path: 'store', namespace: 'fixture' }));
  b.onResolve({ filter: /\/lib\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: args.path === 'env'
    ? 'export const env=globalThis.__CASE_EDITOR_TEST__.env;'
    : args.path === 'api' ? 'export function database(){return {};}'
    : `const s=globalThis.__CASE_EDITOR_TEST__;
       export async function ensureCaseCatalog(){s.seeds++;}
       export async function readEditorialQueue(){return [{caseId:'test-case',revision:2}];}
       export async function readCase(db,id){return id==='test-case'?{id,updates:[{revision:2}],sources:[],lastCheck:null}:null;}
       export async function recordCaseCheck(db,input){s.writes.push(input);return {check:input.check,idempotent:false};}
       export async function appendCaseUpdate(db,input){s.writes.push(input);return {update:input.update,idempotent:false};}` }));
} }] });
const { POST } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
let passed=0;
const owner = { 'oai-authenticated-user-id':'trusted-editor', 'oai-authenticated-user-email':'owner@example.test' };
async function rpc(method, args={}, headers={}, name) {
  const body={jsonrpc:'2.0',id:7,method,...(name?{params:{name,arguments:args}}:{})};
  const response=await POST(new Request('https://siden-sidst.test/mcp',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}));
  const data=await response.json();return {response,data,value:data.result?.content?JSON.parse(data.result.content[0].text):data.result};
}
async function test(name,run){await run();passed++;console.log('PASS '+name);}
const review={caseId:'test-case',reviewedAt:new Date().toISOString(),status:'checked',note:'Reviewed official source.',sourceIds:['source-one']};
await test('MCP discovery exposes the stateless protocol and bounded editorial schemas',async()=>{
  const {value}=await rpc('server/discover');assert.deepEqual(value.supportedVersions,['2026-07-28']);
  const tools=(await rpc('tools/list')).value.tools;assert.equal(tools.length,5);assert.ok(tools.find(t=>t.name==='publish_case_update').inputSchema.additionalProperties===false);
  const schema=tools.find(t=>t.name==='publish_case_update').inputSchema.properties;
  assert.equal(schema.caseId.maxLength,100);assert.equal(schema.update.properties.sourceIds.maxItems,40);
  assert.equal(schema.update.properties.snapshot.properties.openQuestions.items.maxLength,600);
  assert.ok(schema.update.properties.occurredAt.anyOf.some(type=>type.format==='date'));
});
await test('anonymous public readers cannot publish or record reviews',async()=>{
  const before=state.writes.length;
  for(const name of ['record_case_review','publish_case_update'])assert.equal((await rpc('tools/call',review,{},name)).data.result.isError,true);
  assert.equal(state.writes.length,before);
});
await test('another signed-in visitor cannot act as the owner editor',async()=>{
  const before=state.writes.length;
  const r=await rpc('tools/call',review,{'oai-authenticated-user-id':'someone-else','oai-authenticated-user-email':'visitor@example.test'},'record_case_review');
  assert.equal(r.data.result.isError,true);assert.equal(state.writes.length,before);
});
await test('request JSON cannot impersonate an editor and a user ID alone is insufficient',async()=>{
  for(const headers of [{},{'oai-authenticated-user-id':'trusted-editor'}])assert.equal((await rpc('tools/call',{...review,callerId:'trusted-editor',email:'owner@example.test'},headers,'record_case_review')).data.result.isError,true);
});
await test('editing is disabled until a known owner identity is explicitly configured',async()=>{
  delete state.env.CASE_EDITOR_USER_ID;
  assert.equal((await rpc('tools/call',review,owner,'record_case_review')).data.result.isError,true);
  const who=(await rpc('tools/call',{},owner,'editor_identity')).value;assert.equal(who.configured,false);assert.equal(who.canWrite,false);
  state.env.CASE_EDITOR_USER_ID='trusted-editor';
});
await test('the configured editor can record a current source review',async()=>{
  const r=await rpc('tools/call',review,owner,'record_case_review');assert.equal(r.data.result.isError,undefined);assert.equal(r.value.check.status,'checked');assert.equal(state.writes.at(-1).caseId,'test-case');
});
await test('a complete check requires evidence and cannot invent future or stale review time',async()=>{
  for(const extra of [{sourceIds:[]},{reviewedAt:'2099-01-01T00:00:00Z'},{reviewedAt:'2001-01-01T00:00:00Z'},{status:'no-news'},{note:''}])assert.equal((await rpc('tools/call',{...review,...extra},owner,'record_case_review')).data.result.isError,true);
});
await test('failed source checks can be recorded honestly without evidence or a new edition',async()=>{
  const r=await rpc('tools/call',{...review,status:'unavailable',sourceIds:[],note:'The official source could not be read.'},owner,'record_case_review');assert.equal(r.value.check.status,'unavailable');
});
await test('publish keeps expected revision and edition identity for storage concurrency guards',async()=>{
  const update={id:'edition-three',revision:3,recordedAt:new Date().toISOString()};
  const r=await rpc('tools/call',{caseId:'test-case',expectedRevision:2,update},owner,'publish_case_update');assert.equal(r.value.update.id,'edition-three');assert.equal(state.writes.at(-1).expectedRevision,2);
});
await test('cross-origin browser writes and oversized bodies are rejected before dispatch',async()=>{
  assert.equal((await rpc('tools/call',review,{...owner,origin:'https://evil.example'},'record_case_review')).response.status,403);
  const r=await POST(new Request('https://siden-sidst.test/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({payload:'x'.repeat(131073)})}));assert.equal(r.status,400);
});
await test('unknown tools, malformed JSON and missing cases return errors without writes',async()=>{
  const before=state.writes.length;
  assert.equal((await rpc('tools/call',{},owner,'unknown')).data.result.isError,true);
  assert.equal((await rpc('tools/call',{caseId:'missing'},owner,'get_case_record')).data.result.isError,true);
  const r=await POST(new Request('https://siden-sidst.test/mcp',{method:'POST',headers:{'content-type':'application/json'},body:'{'}));assert.equal(r.status,400);assert.equal(state.writes.length,before);
});

// Exercise the real MCP + store boundary together, including atomic persisted retries.
const fixed='2020-03-01T09:00:00.000Z';
const source={id:'source-one',title:'Isoleret testkilde',publisher:'Eksempelkommune',url:'https://example.org/case',publishedAt:'2020-02-01',checkedAt:fixed,evidence:'Syntetisk dokumentation, kun til isolerede test.'};
const snapshot={status:'awaiting',answer:'En offentliggjort beslutning afventes.',openQuestions:['Hvornår træffes beslutningen?'],nextStep:{label:'Afventer en dokumenteret beslutning.',expectedAt:null,sourceIds:[]}};
const edition={id:'initial',revision:1,kind:'background',title:'Forslag offentliggjort',change:'Et forslag er offentliggjort.',whyItMatters:'Et lokalt forhold kan blive ændret.',occurredAt:'2020-02-01',recordedAt:fixed,sourceIds:[source.id],snapshot};
const fixture={id:'test-case',question:'Bliver forslaget gennemført?',description:'Syntetisk test, ikke offentlig nyhed.',topics:['samfund'],region:'danmark',scope:'national',imageKey:'city',sources:[source],updates:[edition],monitoring:{sourceUrls:[source.url],keywords:['test'],reviewEveryHours:24},lastCheck:{checkedAt:fixed,status:'checked',note:'Isoleret kontrol.',sourceIds:[source.id]}};
const env=state.env;
const actual=await build({stdin:{contents:"export { POST } from './app/mcp/route.ts'; export * as store from './app/lib/case-store.ts';",resolveDir:root,sourcefile:'editor-store-integration.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'node24',logLevel:'silent',plugins:[{name:'isolated-editor-database',setup(b){
  b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'actual-env'}));
  b.onLoad({filter:/.*/,namespace:'actual-env'},()=>({contents:'export const env=globalThis.__CASE_EDITOR_TEST__.env;',loader:'js'}));
  b.onResolve({filter:/case-catalog$/},()=>({path:'catalog',namespace:'actual-catalog'}));
  b.onLoad({filter:/.*/,namespace:'actual-catalog'},()=>({contents:`export const CASE_CATALOG=${JSON.stringify([fixture])};`,loader:'js'}));
}}]});
const actualRoute=await import(`data:text/javascript;base64,${Buffer.from(actual.outputFiles[0].text).toString('base64')}`);
const migrations=await Promise.all((await readdir(resolve(root,'drizzle'))).filter(name=>name.endsWith('.sql')).sort().map(name=>readFile(resolve(root,'drizzle',name),'utf8')));
let sqlite;
class Statement {
  constructor(database,sql,values=[]){this.database=database;this.sql=sql;this.values=values;}
  bind(...values){return new Statement(this.database,this.sql,values);}
  async all(){return {success:true,results:this.database.prepare(this.sql).all(...this.values),meta:{changes:0}};}
  async first(column){const row=this.database.prepare(this.sql).get(...this.values);return row?(column===undefined?row:row[column]):null;}
  async run(){const result=this.database.prepare(this.sql).run(...this.values);return {success:true,results:[],meta:{changes:Number(result.changes)}};}
}
class SqliteD1 {
  constructor(database){this.database=database;}
  prepare(sql){return new Statement(this.database,sql);}
  async batch(statements){
    this.database.exec('BEGIN IMMEDIATE');
    try{const result=statements.map(s=>{const query=this.database.prepare(s.sql);if(query.columns().length)return {success:true,results:query.all(...s.values),meta:{changes:0}};const value=query.run(...s.values);return {success:true,results:[],meta:{changes:Number(value.changes)}};});this.database.exec('COMMIT');return result;}
    catch(error){this.database.exec('ROLLBACK');throw error;}
  }
}
async function resetActual(){sqlite?.close();sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const migration of migrations)sqlite.exec(migration);env.DB=new SqliteD1(sqlite);await actualRoute.store.ensureCaseCatalog(env.DB);}
async function actualRpc(name,args,headers=owner){const response=await actualRoute.POST(new Request('https://siden-sidst.test/mcp',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));const data=await response.json();return {data,value:JSON.parse(data.result.content[0].text)};}
const now=()=>new Date(Date.now()).toISOString();
const nextEdition=(changes={})=>({...structuredClone(edition),id:'decision',revision:2,kind:'decision',title:'Beslutningen er offentliggjort',change:'Kommunen har vedtaget forslaget.',recordedAt:now(),snapshot:{...structuredClone(snapshot),status:'active',answer:'Forslaget er vedtaget, men afventer gennemførelse.'},...changes});
const input=(update=nextEdition(),sources)=>({caseId:'test-case',expectedRevision:1,update,...(sources?{sources}:{})});
const rows=table=>sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
async function realTest(name,run){await resetActual();await test(name,run);}

await realTest('new source versions require a recent genuine review time before any publication is stored',async()=>{
  for(const checkedAt of ['2099-01-01T00:00:00Z',fixed,new Date().toISOString().slice(0,10),'not-a-time']){
    const fresh={...source,id:'new-evidence',checkedAt};
    const result=await actualRpc('publish_case_update',input(nextEdition({sourceIds:[fresh.id]}),[fresh]));
    assert.equal(result.data.result.isError,true);assert.equal(rows('case_updates'),1);assert.equal(rows('case_sources'),1);
  }
  const fresh={...source,id:'new-evidence',checkedAt:now()};
  const accepted=await actualRpc('publish_case_update',input(nextEdition({sourceIds:[fresh.id]}),[fresh]));
  assert.equal(accepted.data.result.isError,undefined);assert.equal(rows('case_sources'),2);
});
await realTest('unchanged existing source versions keep their original check time and cannot be rewritten',async()=>{
  const accepted=await actualRpc('publish_case_update',input(nextEdition(),[source]));
  assert.equal(accepted.data.result.isError,undefined);assert.equal(accepted.value.case.sources[0].checkedAt,fixed);
  const rejected=await actualRpc('publish_case_update',{...input(nextEdition({id:'other',revision:3}),[{...source,checkedAt:'2099-01-01T00:00:00Z'}]),expectedRevision:2});
  assert.equal(rejected.data.result.isError,true);assert.equal(rows('case_updates'),2);assert.equal(rows('case_sources'),1);
});
await realTest('an identical persisted publication remains idempotent beyond 48 hours while changed content is rejected',async()=>{
  const fresh={...source,id:'reviewed-source',checkedAt:now()};const payload=input(nextEdition({sourceIds:[fresh.id]}),[fresh]);
  assert.equal((await actualRpc('publish_case_update',payload)).data.result.isError,undefined);
  const originalNow=Date.now;const advance=originalNow()+72*60*60*1000;Date.now=()=>advance;
  try{
    const retry=await actualRpc('publish_case_update',payload);assert.equal(retry.value.idempotent,true);assert.equal(rows('case_updates'),2);assert.equal(rows('case_sources'),2);
    const changed=structuredClone(payload);changed.update.change='A rewritten event under the same ID.';
    assert.equal((await actualRpc('publish_case_update',changed)).data.result.isError,true);
    const unpublished=structuredClone(payload);unpublished.update.id='unpublished-old';unpublished.update.revision=3;unpublished.expectedRevision=2;
    assert.equal((await actualRpc('publish_case_update',unpublished)).data.result.isError,true);assert.equal(rows('case_updates'),2);
  }finally{Date.now=originalNow;}
});
await realTest('the latest exact review can be retried beyond 48 hours without refreshing its timestamp',async()=>{
  const review={caseId:'test-case',reviewedAt:now(),status:'checked',note:'Test source inspected.',sourceIds:[source.id]};
  assert.equal((await actualRpc('record_case_review',review)).data.result.isError,undefined);
  const originalNow=Date.now;const advance=originalNow()+72*60*60*1000;Date.now=()=>advance;
  try{
    const retry=await actualRpc('record_case_review',review);assert.equal(retry.value.idempotent,true);assert.equal(retry.value.check.checkedAt,review.reviewedAt);assert.equal(rows('case_checks'),2);
    assert.equal((await actualRpc('record_case_review',{...review,note:'Changed old review.'})).data.result.isError,true);
  }finally{Date.now=originalNow;}
});
await realTest('superseded old review replays stay within the documented 48-hour window',async()=>{
  const review={caseId:'test-case',reviewedAt:now(),status:'checked',note:'First review.',sourceIds:[source.id]};
  await actualRpc('record_case_review',review);
  await actualRpc('record_case_review',{...review,reviewedAt:new Date(Date.parse(review.reviewedAt)+1000).toISOString(),note:'A later review.'});
  const originalNow=Date.now;const advance=originalNow()+72*60*60*1000;Date.now=()=>advance;
  try{assert.equal((await actualRpc('record_case_review',review)).data.result.isError,true);assert.equal(rows('case_checks'),3);}finally{Date.now=originalNow;}
});
await realTest('real storage cannot be mutated by public visitors or invalid source/update identifiers',async()=>{
  assert.equal((await actualRpc('publish_case_update',input(),{})).data.result.isError,true);
  for(const id of ['Bad-Id','source.dot','source_underscore','-leading','constructor','a'.repeat(101)])assert.equal((await actualRpc('publish_case_update',input(nextEdition({id})))).data.result.isError,true);
  assert.equal(rows('case_updates'),1);assert.equal(rows('case_sources'),1);
});
sqlite.close();delete globalThis.__CASE_EDITOR_TEST__;
console.log(`${passed} editorial access, protocol and real store integration checks passed. Trusted Sites header injection and real MCP/OAuth are verified separately in hosting.`);
