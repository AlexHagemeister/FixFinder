import { afterEach, describe, expect, it, vi } from "vitest";

// USE_REAL_PHOTO_READER is read when the module loads, so each test loads it fresh after setting the flag.
async function loadDescribePhoto(real: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_REAL_PHOTO_READER", real ? "1" : "");
  return (await import("./describe-photo.ts")).describePhoto;
}

const PHOTO = new File(["photo bytes"], "photo.jpg", { type: "image/jpeg" });

function answer(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("describePhoto", () => {
  it("uses the stand-in by default, which calls nothing and marks its description as sample output", async () => {
    const describePhoto = await loadDescribePhoto(false);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await describePhoto(PHOTO)).toEqual({ outcome: "described", description: "Pothole", sample: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the photo to the photo reader and passes its description on", async () => {
    const describePhoto = await loadDescribePhoto(true);
    const fetch = answer(200, { outcome: "described", description: "Overflowing trash can" });
    vi.stubGlobal("fetch", fetch);
    expect(await describePhoto(PHOTO)).toEqual({
      outcome: "described",
      description: "Overflowing trash can",
      sample: false,
    });
    // jsdom cannot draw a photo, so it goes as it is, which is the fallback a browser that cannot shrink it takes.
    expect(fetch).toHaveBeenCalledWith("/api/describe-photo", expect.objectContaining({ method: "POST", body: PHOTO }));
  });

  it("says unclear when the photo reader could not tell", async () => {
    const describePhoto = await loadDescribePhoto(true);
    vi.stubGlobal("fetch", answer(200, { outcome: "unclear" }));
    expect(await describePhoto(PHOTO)).toEqual({ outcome: "unclear" });
  });

  it.each([
    ["it is busy", 429],
    ["it reached today's spending cap", 503],
    ["the model did not answer", 502],
  ])("says unreachable when %s", async (_, status) => {
    const describePhoto = await loadDescribePhoto(true);
    vi.stubGlobal("fetch", answer(status, { error: "No." }));
    expect(await describePhoto(PHOTO)).toEqual({ outcome: "unreachable" });
  });

  it.each([
    ["the photo is too big", 413],
    ["the photo is a format the model cannot read", 415],
  ])("says unclear, not unreachable, when %s, since Try again would fail the same way", async (_, status) => {
    const describePhoto = await loadDescribePhoto(true);
    vi.stubGlobal("fetch", answer(status, { error: "No." }));
    expect(await describePhoto(PHOTO)).toEqual({ outcome: "unclear" });
  });

  it("says unreachable with no connection", async () => {
    const describePhoto = await loadDescribePhoto(true);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await describePhoto(PHOTO)).toEqual({ outcome: "unreachable" });
  });

  it("never passes on an answer it does not recognize", async () => {
    const describePhoto = await loadDescribePhoto(true);
    vi.stubGlobal("fetch", answer(200, { outcome: "described", description: "" }));
    expect(await describePhoto(PHOTO)).toEqual({ outcome: "unreachable" });
  });
});
