import { env } from "cloudflare:workers";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// GitHub Pages is a second frontend for this API, not an authentication provider.
// Origins contain no repository path; allow only the verified owner's HTTPS origin.
const allowedFrontendOrigins = new Set(["https://drdur88.github.io"]);

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  return origin && (origin === new URL(request.url).origin || allowedFrontendOrigins.has(origin)) ? origin : null;
}

function checkRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigin(request)) throw new ApiError(403, "Åbn formularen på Siden sidst og prøv igen.");
  // A legitimate cross-site frontend must identify an explicitly allowed origin.
  if (request.headers.get("sec-fetch-site") === "cross-site" && (!origin || !allowedFrontendOrigins.has(origin))) {
    throw new ApiError(403, "Forespørgslen blev afvist.");
  }
}

function responseHeaders(request?: Request) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
  });
  const origin = request ? allowedOrigin(request) : null;
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

export function json(value: unknown, status = 200, request?: Request) {
  return Response.json(value, { status, headers: responseHeaders(request) });
}

export function preflight(request: Request, methods: readonly string[]) {
  try {
    checkRequestOrigin(request);
    if (!allowedOrigin(request)) throw new ApiError(403, "Forespørgslen blev afvist.");
    const method = request.headers.get("access-control-request-method") || "";
    if (!methods.includes(method)) throw new ApiError(405, "Denne handling understøttes ikke.");
    const requestedHeaders = (request.headers.get("access-control-request-headers") || "")
      .split(",").map((header) => header.trim().toLowerCase()).filter(Boolean);
    if (requestedHeaders.some((header) => header !== "content-type")) throw new ApiError(403, "Forespørgslen blev afvist.");
    const headers = responseHeaders(request);
    headers.set("Access-Control-Allow-Methods", methods.join(", "));
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
    headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    return new Response(null, { status: 204, headers });
  } catch (error) { return fail(error, request); }
}

export function database(): D1Database {
  if (!env.DB) throw new ApiError(503, "Tilmeldingen er midlertidigt utilgængelig. Prøv igen om lidt.");
  return env.DB;
}

export async function sha256(value: string): Promise<string> {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(data), (v) => v.toString(16).padStart(2, "0")).join("");
}

export function createToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) => v.toString(16).padStart(2, "0")).join("");
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  checkRequestOrigin(request);
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw new ApiError(415, "Formularen skal sendes som JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Formularen er tom.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new ApiError(413, "Formularen er for stor."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("object required");
    return data as Record<string, unknown>;
  } catch { throw new ApiError(400, "Formularen kunne ikke læses. Prøv igen."); }
}

export async function rateLimit(request: Request, route: string, limit: number) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / 600);
  const ip = request.headers.get("cf-connecting-ip") || "local-preview";
  const key = await sha256(`${route}:${bucket}:${ip}`);
  const db = database();
  await db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
  const counter = await db.prepare(
    "INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count"
  ).bind(key, (bucket + 2) * 600).first<{ count: number }>();
  if (!counter || counter.count > limit) throw new ApiError(429, "Der er sendt flere forsøg på kort tid. Prøv igen om 10 minutter.");
}

export function fail(error: unknown, request?: Request): Response {
  if (error instanceof ApiError) return json({ error: error.message }, error.status, request);
  console.error("Siden sidst: request could not be completed");
  return json({ error: "Det lykkedes ikke at gemme. Prøv igen om lidt." }, 503, request);
}
