// The photo reader (issue #25): POST /api/describe-photo with the photo as the request body, and the answer is a short
// description of the problem in it, or word that FixFinder could not tell what the problem is.
//
// The route is open to the internet and every call spends the team's OpenRouter credit, so it guards itself before it
// calls the model: a size cap on the photo, a per-minute limit on calls, and a daily cap on spend.

import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { openRouterModel, type ModelCallsEnv } from "./model-calls.ts";
import { MODELS } from "./models.ts";

export interface DescribePhotoEnv extends ModelCallsEnv {
  /** Cloudflare's rate limiter for this route, set in wrangler.jsonc (20 calls a minute). */
  DESCRIBE_PHOTO_LIMITER: RateLimit;
}

/** What the route answers with a 200. Every other status means the photo reader could not be reached. */
export type DescribePhotoAnswer = { outcome: "described"; description: string } | { outcome: "unclear" };

export const OPERATION = "describePhoto";

/**
 * The app shrinks photos well below this before sending. When the browser cannot shrink one, the app sends it as it
 * is, so this leaves room for a full-size phone photo while still refusing anything far bigger.
 */
export const MAX_PHOTO_BYTES = 10_000_000;

/** The photo formats the model reads (OpenRouter's image inputs). A HEIC photo the browser could not shrink is not one. */
export const READABLE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Once today's recorded spend (UTC) reaches this, the photo reader stops until midnight UTC. In US dollars. */
export const DAILY_SPEND_CAP_USD = 0.5;

/** How long the model gets to answer. The app gives up a little after this and offers Try again. */
export const MODEL_TIMEOUT_MS = 15_000;

/** The longest description FixFinder shows. A real one is a few words, like "Overflowing trash can". */
const MAX_DESCRIPTION_CHARS = 60;
const MAX_DESCRIPTION_WORDS = 8;

const INSTRUCTIONS = `You look at a photo that someone took of a problem in a public space, and you name the problem in a short phrase, the way a person would say it to a city worker. Examples: "Pothole", "Overflowing trash can", "Graffiti on bus shelter", "Broken streetlight", "Fallen tree branch on sidewalk".

- Use two to six words, in sentence case, with no period at the end.
- Name what is wrong, not only the object: "Cracked sidewalk", not "Sidewalk".
- If the photo does not clearly show a problem in a public space (it is too dark or blurry, nothing looks broken or wrong, or it shows something else), set problemFound to false and leave description empty.`;

const answerSchema = z.object({
  problemFound: z.boolean().describe("True when the photo clearly shows a problem in a public space."),
  description: z.string().describe("The short phrase naming the problem, or empty when problemFound is false."),
});

// Words that mean the model is talking about itself or the photo instead of naming a problem (criterion 6 on #25).
// Any mention of the photo itself counts ("Blurry image", "Photo too dark"): a rare real description that uses one of
// those words ("Broken photo radar sign") is refused too, and the user gets Retake photo or Describe it yourself. "I"
// counts only as the model speaking, so "Pothole on I-80" gets through.
const SELF_TALK =
  /\b(sorry|apolog\w*|unable|cannot|can't|can not|could not|couldn't|not sure|hard to (say|tell)|to tell|identify|photos?|images?|pictures?)\b|(^|\s)i('m|’m|\s+(am|see|think|can|cannot|can't|could|do|don't|was|would|notice))\b/i;

// Answers that say there is nothing to name: "None", "N/A", "Nothing looks broken", "No problem visible".
const NON_ANSWER =
  /^(none|nothing|unknown|unclear|blurry|n\/?a|not sure)$|^nothing\b|^too (dark|blurry)\b|\bno (visible |obvious |clear )?(problems?|issues?|damage|hazards?)\b/i;

/**
 * The description to show, cleaned up, or null when the model's text is not a short description of a problem. Its
 * own words (an apology, an explanation, a question) never reach the screen as a description.
 */
export function cleanDescription(text: string): string | null {
  const cleaned = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[.!]+$/, "")
    .trim();
  if (!cleaned) return null;
  if (cleaned.length > MAX_DESCRIPTION_CHARS) return null;
  if (cleaned.split(" ").length > MAX_DESCRIPTION_WORDS) return null;
  if (/[?:;]/.test(cleaned) || SELF_TALK.test(cleaned) || NON_ANSWER.test(cleaned)) return null;
  return cleaned[0]!.toUpperCase() + cleaned.slice(1);
}

/** Asks `model` what problem the photo shows. Throws when the model fails or runs out of time. */
export async function readPhoto(model: LanguageModel, photo: Uint8Array, mediaType: string): Promise<DescribePhotoAnswer> {
  const { output } = await generateText({
    model,
    system: INSTRUCTIONS,
    messages: [{ role: "user", content: [{ type: "file", data: photo, mediaType }] }],
    output: Output.object({ schema: answerSchema }),
    // A retry doubles the wait and the cost. The app offers Try again instead.
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
  const description = output.problemFound ? cleanDescription(output.description) : null;
  return description ? { outcome: "described", description } : { outcome: "unclear" };
}

/** Today's recorded spend, from midnight UTC, in US dollars. */
export async function spendTodayUsd(db: D1Database, now = new Date()): Promise<number> {
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const row = await db
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS spend FROM model_calls WHERE time >= ?")
    .bind(midnight)
    .first<{ spend: number }>();
  return row?.spend ?? 0;
}

const refuse = (status: number, reason: string) => Response.json({ error: reason }, { status });

export async function handleDescribePhoto(request: Request, env: DescribePhotoEnv): Promise<Response> {
  // Some phones send a photo with no type, which is taken as a JPEG. Any type the model cannot read is refused.
  const mediaType = request.headers.get("Content-Type") || "image/jpeg";
  if (!READABLE_PHOTO_TYPES.includes(mediaType.split(";")[0]!.trim().toLowerCase())) {
    return refuse(415, "Send a JPEG, PNG, WebP, or GIF photo.");
  }
  const declared = Number(request.headers.get("Content-Length") ?? 0);
  if (declared > MAX_PHOTO_BYTES) return refuse(413, "That photo is too big.");

  // The limiter counts the call as it starts, so a burst of requests at once cannot all slip through.
  const { success } = await env.DESCRIBE_PHOTO_LIMITER.limit({ key: OPERATION });
  if (!success) return refuse(429, "The photo reader is busy. Try again in a minute.");
  if ((await spendTodayUsd(env.MODEL_CALLS_DB)) >= DAILY_SPEND_CAP_USD) {
    return refuse(503, "The photo reader has reached today's spending cap.");
  }

  const photo = new Uint8Array(await request.arrayBuffer());
  if (photo.byteLength === 0) return refuse(400, "Send a photo.");
  if (photo.byteLength > MAX_PHOTO_BYTES) return refuse(413, "That photo is too big.");

  try {
    const { id, settings } = MODELS.describePhoto;
    const model = openRouterModel(env, OPERATION, id, settings);
    return Response.json(await readPhoto(model, photo, mediaType) satisfies DescribePhotoAnswer);
  } catch (error) {
    console.error("FixFinder's photo reader failed", error);
    return refuse(502, "The photo reader did not answer.");
  }
}
