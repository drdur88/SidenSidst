import { database, fail, json } from "../../lib/api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const db = database();
    await db.batch([
      db.prepare("SELECT id FROM beta_subscriptions LIMIT 0"),
      db.prepare("SELECT id FROM beta_feedback LIMIT 0"),
      db.prepare("SELECT id FROM news_cases LIMIT 0"),
      db.prepare("SELECT id FROM case_sources LIMIT 0"),
      db.prepare("SELECT id FROM case_updates LIMIT 0"),
      db.prepare("SELECT id FROM case_checks LIMIT 0"),
    ]);
    return json({ ok: true, version: "0.4", emailDelivery: false, perVisitorRateLimit: Boolean(request.headers.get("cf-connecting-ip")) }, 200, request);
  } catch (error) { return fail(error, request); }
}
