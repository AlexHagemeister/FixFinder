// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import {
  cleanDescription,
  DAILY_SPEND_CAP_USD,
  handleDescribePhoto,
  MAX_PHOTO_BYTES,
  readPhoto,
  spendTodayUsd,
  type DescribePhotoEnv,
} from "./describe-photo.ts";

const PHOTO = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

function modelAnswering(answer: unknown) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(answer) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 900, noCache: 900, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 10, text: 10, reasoning: 0 },
      },
      warnings: [],
    },
  });
}

describe("cleanDescription", () => {
  it.each([
    ["Pothole", "Pothole"],
    ["overflowing trash can.", "Overflowing trash can"],
    ['  "Graffiti on bus shelter"  ', "Graffiti on bus shelter"],
    ["Broken\nstreetlight", "Broken streetlight"],
  ])("keeps a short description: %j", (text, expected) => {
    expect(cleanDescription(text)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "I'm sorry, but I can't tell what this is.",
    "The image is too dark to see",
    "Sorry",
    "Unable to determine",
    "This photo shows a street with a car parked next to a curb and some trees",
    "Is that a pothole?",
    "Description: pothole",
    "x".repeat(61),
  ])("refuses the model's own words or a long answer: %j", (text) => {
    expect(cleanDescription(text)).toBeNull();
  });
});

describe("readPhoto", () => {
  it("answers with the description the model gave", async () => {
    const model = modelAnswering({ problemFound: true, description: "Overflowing trash can" });
    expect(await readPhoto(model, PHOTO, "image/jpeg")).toEqual({
      outcome: "described",
      description: "Overflowing trash can",
    });
    // The photo goes to the model as an image, with its type.
    const prompt = model.doGenerateCalls[0]!.prompt;
    const user = prompt.find((message) => message.role === "user")!;
    expect(user.content[0]).toMatchObject({ type: "file", mediaType: "image/jpeg" });
  });

  it("answers unclear when the model found no problem", async () => {
    const model = modelAnswering({ problemFound: false, description: "" });
    expect(await readPhoto(model, PHOTO, "image/jpeg")).toEqual({ outcome: "unclear" });
  });

  it("answers unclear, never the model's words, when it says it found a problem but explains instead", async () => {
    const model = modelAnswering({ problemFound: true, description: "I'm sorry, I can't see a problem here." });
    expect(await readPhoto(model, PHOTO, "image/jpeg")).toEqual({ outcome: "unclear" });
  });
});

// A stand-in for D1 that answers the spend query with `spend` and records what it was asked.
function fakeDb(spend: number) {
  const bound: unknown[] = [];
  const db = {
    prepare: vi.fn(() => ({
      bind: (...args: unknown[]) => {
        bound.push(...args);
        return { first: async () => ({ spend }) };
      },
    })),
  };
  return { db: db as unknown as D1Database, bound };
}

// No key: every request these tests send is refused before the model call.
function env({ allowed = true, spend = 0 } = {}): DescribePhotoEnv {
  return {
    MODEL_CALLS_DB: fakeDb(spend).db,
    DESCRIBE_PHOTO_LIMITER: { limit: vi.fn(async () => ({ success: allowed })) },
  } as unknown as DescribePhotoEnv;
}

function photoRequest(body: BodyInit = PHOTO, headers: Record<string, string> = { "Content-Type": "image/jpeg" }) {
  return new Request("https://fixfinder.test/api/describe-photo", { method: "POST", body, headers });
}

describe("spendTodayUsd", () => {
  it("adds up spend from midnight UTC", async () => {
    const { db, bound } = fakeDb(0.12);
    expect(await spendTodayUsd(db, new Date("2026-11-24T19:30:00-08:00"))).toBe(0.12);
    expect(bound).toEqual(["2026-11-25T00:00:00.000Z"]);
  });
});

describe("handleDescribePhoto", () => {
  // None of these reach the model: each is refused before the call, so nothing is spent.
  it("refuses a file that is not a photo", async () => {
    const response = await handleDescribePhoto(photoRequest("hello", { "Content-Type": "text/plain" }), env());
    expect(response.status).toBe(415);
  });

  it("refuses a photo over the size cap", async () => {
    const response = await handleDescribePhoto(photoRequest(new Uint8Array(MAX_PHOTO_BYTES + 1)), env());
    expect(response.status).toBe(413);
  });

  it("refuses an empty body", async () => {
    const response = await handleDescribePhoto(photoRequest(new Uint8Array(0)), env());
    expect(response.status).toBe(400);
  });

  it("refuses when the per-minute limit is used up", async () => {
    const response = await handleDescribePhoto(photoRequest(), env({ allowed: false }));
    expect(response.status).toBe(429);
  });

  it("refuses once today's spend reaches the cap", async () => {
    const response = await handleDescribePhoto(photoRequest(), env({ spend: DAILY_SPEND_CAP_USD }));
    expect(response.status).toBe(503);
  });
});
