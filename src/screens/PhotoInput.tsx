import type { ChangeEvent, Ref } from "react";

/** Where the photo comes from: the phone's rear camera, or a photo already on the phone. */
export type PhotoSource = "camera" | "library";

// The hidden file input behind a photo button. A visible button calls `click()` on it, inside the tap, so the phone
// opens its camera or its photo picker. The photo stays on the phone. With `source="camera"` (the default) the input
// asks for the rear camera: Home's Take a photo and Result's Retake photo use it. With `source="library"` it leaves
// that out, so the phone offers the photos already on it (an iPhone shows its own short menu first): Home's Choose
// from your photos uses it.
export function PhotoInput({
  ref,
  onPick,
  source = "camera",
}: {
  ref: Ref<HTMLInputElement>;
  onPick: (file: File) => void;
  source?: PhotoSource;
}) {
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so picking the same photo again still counts as a change.
    event.target.value = "";
    if (file) onPick(file);
  }

  return (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={source === "camera" ? "environment" : undefined}
      data-source={source}
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={onChange}
    />
  );
}
