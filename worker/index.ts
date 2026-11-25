// FixFinder's Worker script. wrangler.jsonc sends only /api/* requests here; the app itself is static files.

import { listModelCalls, totalModelCalls, type ModelCallsEnv } from "./model-calls.ts";
import { modelCheck } from "./model-check.ts";

export default {
  async fetch(request: Request, env: ModelCallsEnv & { MODEL_CHECK?: string }): Promise<Response> {
    const url = new URL(request.url);

    // The record of every model call and its totals (issue #12). Open to anyone with the link: it holds only
    // operation names, models, token counts, and costs.
    if (url.pathname === "/api/model-calls" && request.method === "GET") {
      const calls = await listModelCalls(env.MODEL_CALLS_DB);
      return Response.json({ totals: totalModelCalls(calls), calls });
    }

    // TEMPORARY (issue #12): see model-check.ts.
    if (url.pathname === "/api/model-check" && request.method === "POST" && env.MODEL_CHECK === "on") {
      return modelCheck(env);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<ModelCallsEnv & { MODEL_CHECK?: string }>;
