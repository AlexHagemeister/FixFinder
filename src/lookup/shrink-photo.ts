// Shrinks a photo before it goes to the photo reader. A phone photo is 3 to 5 MB, which is slow to send on a cell
// connection while the user waits on Working. The model does not need that much detail to name a pothole.

/** The longest side of the photo the photo reader gets, in pixels. */
export const SHRUNK_LONG_SIDE_PX = 1024;

/** The photo as a JPEG no longer than `longSide` on either side. If the browser cannot shrink it, the photo as it is. */
export async function shrinkPhoto(photo: Blob, longSide = SHRUNK_LONG_SIDE_PX): Promise<Blob> {
  try {
    // from-image turns the photo upright the way the camera meant it, so a portrait photo is not sent sideways.
    const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
    const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return photo;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const shrunk = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return shrunk ?? photo;
  } catch {
    // A format the browser cannot draw, such as HEIC in some browsers. The Worker's size cap still applies.
    return photo;
  }
}
