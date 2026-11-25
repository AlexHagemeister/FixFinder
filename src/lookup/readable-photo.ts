// Turns a HEIC photo into a JPEG when the browser cannot show it. iPhones save HEIC, and so can some Android phones.
// Safari draws HEIC itself, but Chrome and Firefox cannot, so without this the photo would not show on Working or
// Result, could not be shrunk, and the photo reader (which reads JPEG, PNG, WebP, and GIF) could not read it.
//
// The decoder (heic-to, libheif in WebAssembly) is about 3 MB, so it loads only when a photo needs it.

/** True when the photo looks like HEIC from its type or name. Some phones leave the type blank, so blank counts. */
function mightBeHeic(photo: File): boolean {
  return photo.type === "" || /^image\/hei[cf]/i.test(photo.type) || /\.hei[cf]$/i.test(photo.name);
}

async function browserCanDraw(photo: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(photo);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

/** The photo as a JPEG when it is HEIC and the browser cannot draw it. Otherwise, or if converting fails, the photo. */
export async function readablePhoto(photo: File): Promise<File> {
  if (!mightBeHeic(photo) || (await browserCanDraw(photo))) return photo;
  try {
    const { isHeic, heicTo } = await import("heic-to");
    if (!(await isHeic(photo))) return photo;
    const jpeg = await heicTo({ blob: photo, type: "image/jpeg", quality: 0.9 });
    const name = `${photo.name.replace(/\.hei[cf]$/i, "") || "photo"}.jpg`;
    return new File([jpeg], name, { type: "image/jpeg", lastModified: photo.lastModified });
  } catch {
    // The photo goes on as it is. The photo reader refuses it, and Working offers Retake photo and Describe it yourself.
    return photo;
  }
}
