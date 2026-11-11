import { database, fail, json } from "../../lib/api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await database().prepare("SELECT id FROM beta_subscriptions LIMIT 0").all();
    await database().prepare("SELECT id FROM beta_feedback LIMIT 0").all();
    return json({ ok: true, version: "0.3", emailDelivery: false, perVisitorRateLimit: Boolean(request.headers.get("cf-connecting-ip")) }, 200, request);
  } catch (error) { return fail(error, request); }
}
