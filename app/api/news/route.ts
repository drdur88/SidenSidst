import { ApiError, fail, json, preflight } from "../../lib/api";
import { getNews } from "../../lib/news-fetch";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) { return preflight(request, ["GET"]); }

export async function GET(request: Request) {
  try { return json(await getNews(), 200, request); }
  catch { return fail(new ApiError(503, "Nyhederne kunne ikke hentes. Prøv igen om lidt."), request); }
}
