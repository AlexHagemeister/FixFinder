// Which OpenRouter model each AI step uses, in one place. Each step can use its own model: changing one is a one-line
// edit here, and `bun run model-calls` shows each step's spend under its operation name.

import type { ModelSettings } from "./model-calls.ts";

export interface StepModel {
  /** The OpenRouter model id. */
  id: string;
  /** Extra OpenRouter settings for the step, such as how much the model reasons before it answers. */
  settings?: ModelSettings;
}

export const MODELS = {
  // Reads the photo and suggests a description (issue #25). It needs decent image understanding and a fast answer,
  // not agentic skill. A first pick from Artificial Analysis's image benchmark (MMMU-Pro) and OpenRouter's prices,
  // 2026-11-24, still to be checked against real photos in round 1.
  describePhoto: { id: "openai/gpt-6-luna", settings: { reasoning: { effort: "low" } } },
} satisfies Record<string, StepModel>;

// TEMPORARY, for the round 1 model comparison on #25: the models a request may ask the photo reader to use instead.
// A strict list, since the route is public and these differ tenfold in price. Remove before the PR merges.
export const DESCRIBE_PHOTO_CANDIDATES: Record<string, StepModel> = {
  "openai/gpt-6-luna": MODELS.describePhoto,
  "google/gemini-3.5-flash-lite": { id: "google/gemini-3.5-flash-lite", settings: { reasoning: { effort: "low" } } },
  "openai/gpt-6.1-terra": { id: "openai/gpt-6.1-terra", settings: { reasoning: { effort: "low" } } },
};
