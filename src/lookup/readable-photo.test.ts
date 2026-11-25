import { afterEach, describe, expect, it, vi } from "vitest";
import { heicTo, isHeic } from "heic-to";
import { readablePhoto } from "./readable-photo.ts";

vi.mock("heic-to", () => ({
  isHeic: vi.fn(async () => true),
  heicTo: vi.fn(async () => new Blob(["jpeg bytes"], { type: "image/jpeg" })),
}));

const HEIC = new File(["heic bytes"], "IMG_0042.HEIC", { type: "image/heic" });

/** Stands in for the browser's decoder: Safari draws HEIC, Chrome and Firefox do not. */
function browserDraws(canDraw: boolean) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => {
      if (!canDraw) throw new DOMException("The source image could not be decoded.", "InvalidStateError");
      return { close: () => {} };
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("readablePhoto", () => {
  it("turns a HEIC photo the browser cannot draw into a JPEG", async () => {
    browserDraws(false);
    const photo = await readablePhoto(HEIC);
    expect(photo.type).toBe("image/jpeg");
    expect(photo.name).toBe("IMG_0042.jpg");
    expect(heicTo).toHaveBeenCalledWith(expect.objectContaining({ blob: HEIC, type: "image/jpeg" }));
  });

  it("leaves a HEIC photo alone when the browser draws it, as Safari does", async () => {
    browserDraws(true);
    expect(await readablePhoto(HEIC)).toBe(HEIC);
    expect(heicTo).not.toHaveBeenCalled();
  });

  it("never loads the decoder for a JPEG", async () => {
    browserDraws(false);
    const jpeg = new File(["jpeg bytes"], "photo.jpg", { type: "image/jpeg" });
    expect(await readablePhoto(jpeg)).toBe(jpeg);
    expect(isHeic).not.toHaveBeenCalled();
  });

  it("sends the photo on as it is when converting fails", async () => {
    browserDraws(false);
    vi.mocked(heicTo).mockRejectedValueOnce(new Error("libheif could not decode it"));
    expect(await readablePhoto(HEIC)).toBe(HEIC);
  });
});
