// TEMPORARY (issue #12): one real call to prove the record works end to end. Only branch previews turn it on, and it
// is deleted before the PR merges. #25 brings the first real feature that calls a model.

import { generateText } from "ai";
import { openRouterModel, type ModelCallsEnv } from "./model-calls.ts";

export async function modelCheck(env: ModelCallsEnv): Promise<Response> {
  const result = await generateText({
    model: openRouterModel(env, "check", "google/gemini-2.5-flash-lite"),
    prompt: "Reply with the single word: ok",
    maxOutputTokens: 5,
  });
  return Response.json({ text: result.text });
}
