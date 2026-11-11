import { ApiError, database, fail, json, preflight, rateLimit, readBody } from "../../lib/api";
import { stories } from "../../lib/stories";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) { return preflight(request, ["POST"]); }

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    await rateLimit(request, "feedback", 10);
    if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 201, request);
    if (typeof body.clarity !== "number" || !Number.isInteger(body.clarity) || body.clarity < 1 || body.clarity > 5) throw new ApiError(400, "Vælg en vurdering fra 1 til 5.");
    if (!["yes", "maybe", "no"].includes(String(body.wouldReturn))) throw new ApiError(400, "Vælg, om du ville vende tilbage.");
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (comment.length > 1500) throw new ApiError(400, "Din kommentar må højst være 1.500 tegn.");
    const storyId = typeof body.storyId === "string" ? body.storyId : null;
    if (storyId && !stories.some((story) => story.id === storyId)) throw new ApiError(400, "Spørgsmålet findes ikke.");
    await database().prepare("INSERT INTO beta_feedback (id,clarity,would_return,comment,story_id,created_at) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), body.clarity, body.wouldReturn, comment, storyId, new Date().toISOString()).run();
    return json({ ok: true }, 201, request);
  } catch (error) { return fail(error, request); }
}
