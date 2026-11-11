import { env } from "cloudflare:workers";
import { database } from "../lib/api";
import { editorContext, requireCaseEditor } from "../lib/case-editor-auth";
import { ensureCaseCatalog, readCase, readEditorialQueue, appendCaseUpdate, recordCaseCheck } from "../lib/case-store";
import type { CaseCheck, CaseCheckStatus, CaseSource, CaseUpdate } from "../lib/case-types";

export const dynamic = "force-dynamic";

const text = (maxLength = 2000) => ({ type: "string", minLength: 1, maxLength });
const id = { type: "string", pattern: "^[a-z0-9][a-z0-9-]{0,99}$", minLength: 1, maxLength: 100, not: { enum: ["constructor", "prototype"] } };
const ids = { type: "array", items: id, maxItems: 40, uniqueItems: true };
const date = { anyOf: [{ type: "string", format: "date-time" }, { type: "string", format: "date" }, { type: "null" }] };
const sourceSchema = {
  type: "object", additionalProperties: false,
  required: ["id", "title", "publisher", "url", "publishedAt", "checkedAt", "evidence"],
  properties: { id, title: text(400), publisher: text(200), url: text(2000), publishedAt: date, checkedAt: text(40), evidence: text(2000) },
};
const updateSchema = {
  type: "object", additionalProperties: false,
  required: ["id", "revision", "kind", "title", "change", "whyItMatters", "occurredAt", "recordedAt", "sourceIds", "snapshot"],
  properties: {
    id, revision: { type: "integer", minimum: 1, maximum: 500 },
    kind: { type: "string", enum: ["background", "development", "decision", "schedule", "correction", "resolution"] },
    title: text(400), change: text(4000), whyItMatters: text(2000), occurredAt: date,
    recordedAt: text(40), sourceIds: { ...ids, minItems: 1 }, correctsUpdateId: id,
    snapshot: {
      type: "object", additionalProperties: false, required: ["status", "answer", "openQuestions", "nextStep"],
      properties: {
        status: { type: "string", enum: ["active", "awaiting", "resolved"] }, answer: text(4000),
        openQuestions: { type: "array", items: text(600), maxItems: 12 },
        nextStep: { type: "object", additionalProperties: false, required: ["label", "expectedAt", "sourceIds"], properties: { label: text(1000), expectedAt: date, sourceIds: ids } },
      },
    },
  },
};
const object = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", additionalProperties: false, properties, required });
const TOOLS = [
  {
    name: "editor_identity", description: "Read the current verified Site-scoped caller identity and whether it is the configured Siden sidst editor. Does not grant permissions or return secrets.",
    inputSchema: object({}), annotations: { readOnlyHint: true },
  },
  {
    name: "list_case_followups", description: "Read the real Siden sidst cases due for editorial follow-up, including their current revision, next milestone, approved source URLs and last verified check. Read source content before claiming a new development or no change.",
    inputSchema: object({}), annotations: { readOnlyHint: true },
  },
  {
    name: "get_case_record", description: "Read one persistent Siden sidst case with every published edition and its evidence. Use this before publishing an update and for readback after a write.",
    inputSchema: object({ caseId: id }, ["caseId"]), annotations: { readOnlyHint: true },
  },
  {
    name: "record_case_review", description: "Record a completed editorial source review on a Siden sidst case without inventing a new development. Owner-editor only. Use checked only after successfully reviewing the relevant sources; partial/unavailable when evidence could not be checked, pending_review for unresolved material changes. This updates check freshness, not the case revision. Reuse reviewedAt and the identical payload on retry. The latest identical review can be retried without a time limit; other reviews must be within 48 hours.",
    inputSchema: object({ caseId: id, reviewedAt: text(40), status: { type: "string", enum: ["checked", "partial", "unavailable", "pending_review"] }, note: text(1500), sourceIds: ids }, ["caseId", "reviewedAt", "status", "note", "sourceIds"]),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "publish_case_update", description: "Append one source-verified, materially new edition to an existing Siden sidst case. Owner-editor only. First read get_case_record; use its latest revision as expectedRevision and next revision on update. Do not publish duplicate coverage as a new event. Retain source identity/version; corrections name correctsUpdateId. Approved primary-source hosts only. A scheduled target is not evidence of completion. recordedAt is the actual review time; occurredAt is the documented event date. Reuse update.id and payload on retry; reread after a revision conflict. Check get_case_record afterward.",
    inputSchema: object({ caseId: id, expectedRevision: { type: "integer", minimum: 1 }, update: updateSchema, sources: { type: "array", items: sourceSchema, maxItems: 15 } }, ["caseId", "expectedRevision", "update"]),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
];

function response(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function result(value: unknown) { return { content: [{ type: "text", text: JSON.stringify(value) }] }; }
function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object.");
  return value as Record<string, unknown>;
}
function requiredId(value: unknown) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(value) || ["constructor", "prototype"].includes(value)) throw new Error("A valid caseId is required.");
  return value;
}
function reviewTimestamp(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error("Review time must be a complete ISO timestamp with a time zone.");
  const day = value.slice(0, 10);
  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) throw new Error("Review date does not exist.");
  return new Date(value).toISOString();
}
function reviewTime(value: unknown) {
  const timestamp = reviewTimestamp(value);
  const age = Date.now() - Date.parse(timestamp);
  if (age < -60_000 || age > 48 * 60 * 60 * 1000) throw new Error("Review time must be current (within the last 48 hours).");
  return timestamp;
}
async function readRpcBody(request: Request) {
  const stream = request.body?.getReader();
  if (!stream) throw new Error("Empty request.");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const { done, value } = await stream.read(); if (done) break; size += value.byteLength; if (size > 131072) { await stream.cancel(); throw new Error("Request exceeds 128 KB."); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return objectValue(JSON.parse(new TextDecoder().decode(bytes)));
}

async function callTool(request: Request, name: string, args: Record<string, unknown>) {
  if (name === "editor_identity") return editorContext(request, env.CASE_EDITOR_USER_ID);
  if (!["list_case_followups", "get_case_record", "record_case_review", "publish_case_update"].includes(name)) throw new Error("Unknown tool.");
  if (name === "record_case_review" || name === "publish_case_update") requireCaseEditor(request, env.CASE_EDITOR_USER_ID);
  const db = database(); await ensureCaseCatalog(db);
  if (name === "list_case_followups") return { cases: await readEditorialQueue(db), monitoringEnabled: env.CASE_MONITORING_ENABLED === "true" };
  const caseId = requiredId(args.caseId);
  if (name === "get_case_record") {
    const record = await readCase(db, caseId); if (!record) throw new Error("Case not found."); return record;
  }
  if (name === "record_case_review") {
    const checkedAt = reviewTimestamp(args.reviewedAt);
    if (typeof args.status !== "string" || !["checked", "partial", "unavailable", "pending_review"].includes(args.status)) throw new Error("Invalid review status.");
    if (typeof args.note !== "string" || !args.note.trim() || args.note.length > 1500) throw new Error("A concise factual review note is required.");
    if (!Array.isArray(args.sourceIds) || args.sourceIds.length > 40 || args.sourceIds.some(x => typeof x !== "string")) throw new Error("Invalid sourceIds.");
    if (args.status === "checked" && !args.sourceIds.length) throw new Error("A completed check must name the reviewed source evidence.");
    const check: CaseCheck = { checkedAt, status: args.status as CaseCheckStatus, note: args.note.trim(), sourceIds: [...new Set((args.sourceIds as string[]).map(value => value.trim()))] };
    const previous = (await readCase(db, caseId))?.lastCheck;
    const identicalLatest = previous && previous.checkedAt === check.checkedAt && previous.status === check.status && previous.note === check.note && JSON.stringify(previous.sourceIds) === JSON.stringify(check.sourceIds);
    if (!identicalLatest) reviewTime(args.reviewedAt);
    return recordCaseCheck(db, { caseId, check });
  }
  const update = objectValue(args.update) as unknown as CaseUpdate;
  if (!Number.isInteger(args.expectedRevision) || Number(args.expectedRevision) < 1) throw new Error("Expected current revision is required.");
  if (args.sources !== undefined && (!Array.isArray(args.sources) || args.sources.length > 15)) throw new Error("At most 15 source references per edition.");
  const current = await readCase(db, caseId);
  if (!current) throw new Error("Case not found.");
  // Exact stored editions can be replayed even after the fresh-publication window.
  // The store still compares the complete normalized update and immutable sources.
  if (!current.updates.some(previous => previous.id === update.id)) reviewTime(update.recordedAt);
  for (const value of (args.sources || []) as unknown[]) {
    const source = objectValue(value);
    if (!current.sources.some(previous => previous.id === source.id)) reviewTime(source.checkedAt);
  }
  return appendCaseUpdate(db, { caseId, expectedRevision: Number(args.expectedRevision), update, sources: args.sources as CaseSource[] | undefined });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return response({ error: "Cross-origin editorial requests are not supported." }, 403);
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return response({ error: "JSON required." }, 415);
  let rpc: Record<string, unknown>;
  try { rpc = await readRpcBody(request); } catch { return response({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid or oversized JSON request." } }, 400); }
  const rpcId = typeof rpc.id === "number" || typeof rpc.id === "string" ? rpc.id : null;
  if (rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") return response({ jsonrpc: "2.0", id: rpcId, error: { code: -32600, message: "Invalid request." } }, 400);
  if (rpc.method.startsWith("notifications/")) return new Response(null, { status: 202 });
  if (rpc.method === "server/discover") return response({ jsonrpc: "2.0", id: rpcId, result: { supportedVersions: ["2026-07-28"], capabilities: { tools: {} }, serverInfo: { name: "Siden sidst — sagsopfølgning", version: "0.4.0" } } });
  if (rpc.method === "initialize") return response({ jsonrpc: "2.0", id: rpcId, result: { protocolVersion: "2026-07-28", capabilities: { tools: {} }, serverInfo: { name: "Siden sidst — sagsopfølgning", version: "0.4.0" } } });
  if (rpc.method === "ping") return response({ jsonrpc: "2.0", id: rpcId, result: {} });
  if (rpc.method === "tools/list") return response({ jsonrpc: "2.0", id: rpcId, result: { tools: TOOLS } });
  if (rpc.method !== "tools/call") return response({ jsonrpc: "2.0", id: rpcId, error: { code: -32601, message: "Method not found." } });
  try {
    const params = objectValue(rpc.params), args = params.arguments === undefined ? {} : objectValue(params.arguments);
    return response({ jsonrpc: "2.0", id: rpcId, result: result(await callTool(request, String(params.name), args)) });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "EDITORIAL_REQUEST_REJECTED";
    const message = error instanceof Error ? error.message : "Editorial request could not be completed.";
    return response({ jsonrpc: "2.0", id: rpcId, result: { ...result({ error: code, message }), isError: true } });
  }
}
