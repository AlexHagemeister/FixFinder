// FixFinder's Worker script. wrangler.jsonc sends only /api/* requests here; the app itself is static files.

import { handleDescribePhoto, type DescribePhotoEnv } from "./describe-photo.ts";
import { listModelCalls, totalModelCalls } from "./model-calls.ts";

export default {
  async fetch(request: Request, env: DescribePhotoEnv): Promise<Response> {
    const url = new URL(request.url);

    // The record of every model call and its totals (issue #12). Open to anyone with the link: it holds only
    // operation names, models, token counts, and costs.
    if (url.pathname === "/api/model-calls" && request.method === "GET") {
      const calls = await listModelCalls(env.MODEL_CALLS_DB);
      return Response.json({ totals: totalModelCalls(calls), calls });
    }

    // The photo reader (issue #25). It spends money, so it guards itself: see describe-photo.ts.
    if (url.pathname === "/api/describe-photo" && request.method === "POST") {
      return handleDescribePhoto(request, env);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<DescribePhotoEnv>;
