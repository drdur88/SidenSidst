import { ApiError, createToken, database, fail, json, preflight, rateLimit, readBody, sha256 } from "../../lib/api";
import { stories } from "../../lib/stories";

export const dynamic = "force-dynamic";
const validIds = new Set(stories.map((story) => story.id));
const message = "Vi har modtaget din tilmelding. En eksisterende tilmelding til samme email ændres ikke.";

export function OPTIONS(request: Request) { return preflight(request, ["POST", "DELETE"]); }

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    await rateLimit(request, "subscribe", 12);
    if (body.receiptToken !== undefined && (typeof body.receiptToken !== "string" || !/^[a-f0-9]{64}$/.test(body.receiptToken))) throw new ApiError(400, "Tilmeldingskoden er ugyldig. Genindlæs siden og prøv igen.");
    // A client-generated receipt is persisted before sending so a lost response can be retried safely.
    const token = typeof body.receiptToken === "string" ? body.receiptToken : createToken();
    if (typeof body.website === "string" && body.website.trim()) return json({ ok: true, message, token }, 202, request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>.]{2,}$/u.test(email)) throw new ApiError(400, "Skriv en gyldig emailadresse.");
    if (body.consent !== true) throw new ApiError(400, "Du skal give samtykke til tilmeldingen.");
    const rawInterests = body.interests ?? [];
    if (!Array.isArray(rawInterests) || rawInterests.length > 6 || rawInterests.some((id) => typeof id !== "string" || !validIds.has(id))) throw new ApiError(400, "Et af de valgte spørgsmål findes ikke.");
    const interests = [...new Set(rawInterests as string[])];
    const now = new Date().toISOString();
    await database().prepare(
      "INSERT INTO beta_subscriptions (id,email,created_at,consent_at,consent_version,verification_status,interests_json,manage_token_hash) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING"
    ).bind(crypto.randomUUID(), email, now, now, "beta-contact-v1-2026-11-10", "unverified", JSON.stringify(interests), await sha256(token)).run();
    return json({ ok: true, message, token }, 202, request);
  } catch (error) { return fail(error, request); }
}

export async function DELETE(request: Request) {
  try {
    const body = await readBody(request);
    await rateLimit(request, "unsubscribe", 15);
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(400, "Slettekoden skal bestå af 64 tegn.");
    const result = await database().prepare("DELETE FROM beta_subscriptions WHERE manage_token_hash = ?").bind(await sha256(token)).run();
    if (!result.meta.changes) throw new ApiError(404, "Ingen tilmelding fundet med denne kode. Den kan allerede være slettet. Hvis emailen var tilmeldt i forvejen, skal du bruge den oprindelige kode.");
    return json({ ok: true, message: "Din email og dine tilmeldingsoplysninger er slettet." }, 200, request);
  } catch (error) { return fail(error, request); }
}
