import type { ChangeEvent, Ref } from "react";

// The hidden file input that opens the phone's rear camera. A visible button calls `click()` on it, inside the tap,
// so the camera opens. The photo stays on the phone. Home's Take a photo and Result's Retake photo both use it.
export function PhotoInput({ ref, onPick }: { ref: Ref<HTMLInputElement>; onPick: (file: File) => void }) {
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so taking the same photo again still counts as a change.
    event.target.value = "";
    if (file) onPick(file);
  }

  return (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture="environment"
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={onChange}
    />
  );
}
