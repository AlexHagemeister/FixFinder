// Reads the photo and suggests a description (issue #25), through the Worker's photo reader at /api/describe-photo.
//
// Real or stand-in: the live app and branch previews always use the real photo reader, which spends the team's
// OpenRouter credit. `bun run dev` uses a stand-in that answers "Pothole" for every photo and spends nothing, unless
// it is started with VITE_REAL_PHOTO_READER=1 (README § AI usage says when that is worth it). Tests replace this module.

import { shrinkPhoto } from "./shrink-photo.ts";

/** What reading the photo found. */
export type PhotoReading =
  /** A description FixFinder made from the photo. `sample` is true when it came from the stand-in, not the photo. */
  | { outcome: "described"; description: string; sample: boolean }
  /** The photo reader looked and could not tell what the problem is, or the photo is one it cannot read. */
  | { outcome: "unclear" }
  /** The photo reader could not be reached: no connection, no answer in time, or it is switched off for now. */
  | { outcome: "unreachable" };

export const USE_REAL_PHOTO_READER = import.meta.env.PROD || import.meta.env.VITE_REAL_PHOTO_READER === "1";

/** How long FixFinder waits for the photo reader. The Worker gives the model a little less than this. */
export const PHOTO_READER_TIMEOUT_MS = 20_000;

/** How long the stand-in pretends to read, so the Working screen shows the step. */
const STAND_IN_DELAY_MS = 800;

export async function describePhoto(photo: Blob): Promise<PhotoReading> {
  if (!USE_REAL_PHOTO_READER) {
    await new Promise((resolve) => setTimeout(resolve, STAND_IN_DELAY_MS));
    return { outcome: "described", description: "Pothole", sample: true };
  }
  try {
    const shrunk = await shrinkPhoto(photo);
    const response = await fetch("/api/describe-photo", {
      method: "POST",
      headers: { "Content-Type": shrunk.type || "image/jpeg" },
      body: shrunk,
      signal: AbortSignal.timeout(PHOTO_READER_TIMEOUT_MS),
    });
    // Too big, or a format the model cannot read: the same photo would fail again, so Try again cannot help. Retake
    // photo and Describe it yourself can.
    if (response.status === 413 || response.status === 415) return { outcome: "unclear" };
    if (!response.ok) return { outcome: "unreachable" };
    const answer = (await response.json()) as { outcome?: unknown; description?: unknown };
    if (answer.outcome === "described" && typeof answer.description === "string" && answer.description) {
      return { outcome: "described", description: answer.description, sample: false };
    }
    if (answer.outcome === "unclear") return { outcome: "unclear" };
    return { outcome: "unreachable" };
  } catch {
    return { outcome: "unreachable" };
  }
}
