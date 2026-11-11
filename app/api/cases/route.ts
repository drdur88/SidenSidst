import { env } from "cloudflare:workers";
import { ApiError, fail, json, preflight } from "../../lib/api";
import { ensureCaseCatalog, readCases } from "../../lib/case-store";
import type { CasesResponse } from "../../lib/case-types";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) { return preflight(request, ["GET"]); }

export async function GET(request: Request) {
  try {
    if (!env.DB) throw new ApiError(503, "Sagsarkivet er midlertidigt utilgængeligt. Prøv igen om lidt.");
    await ensureCaseCatalog(env.DB);
    const cases = await readCases(env.DB);
    if (!cases.length) throw new ApiError(503, "Sagsarkivet kunne ikke indlæses.");
    const scheduled = (env as unknown as { CASE_MONITORING_ENABLED?: string }).CASE_MONITORING_ENABLED === "true";
    const response: CasesResponse = {
      cases, generatedAt: new Date().toISOString(), storage: "database",
      monitoring: { state: scheduled ? "scheduled" : "manual", label: scheduled ? "Sagerne følges op efter en fast plan. Tidspunkt og resultat fremgår af hver sag." : "Opdateringer gennemgås før publicering. Seneste kildekontrol fremgår af hver sag." },
    };
    return json(response, 200, request);
  } catch (error) {
    if (error instanceof ApiError) return fail(error, request);
    console.error("Siden sidst: case archive could not be read");
    return fail(new ApiError(503, "Sagsarkivet kunne ikke hentes. Tidligere gemte oplysninger kan stadig vises med deres oprindelige datoer."), request);
  }
}
