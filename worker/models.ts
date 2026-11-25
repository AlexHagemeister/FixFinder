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
  // not agentic skill. Compared on 2026-11-24 on six street-problem photos at 1024px, with low reasoning: Luna, Gemini
  // 3.5 Flash-Lite, and GPT-6.1 Terra named every problem about equally well, in 2 to 5 seconds. Luna cost about
  // $0.00016 a photo, Flash-Lite $0.00045, and Terra $0.0015. A full-size 1.4 MB photo cost Luna three times as much
  // as the shrunk one, for the same answer.
  describePhoto: { id: "openai/gpt-6-luna", settings: { reasoning: { effort: "low" } } },
} satisfies Record<string, StepModel>;
