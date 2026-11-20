import type { ReactNode } from "react";

// The chip and note that mark sample content as a placeholder, the same way on every screen (Nielsen 4).
// `label` is the chip's text and the note's accessible name.
export function PlaceholderNote({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="card pad stack placeholder-note" role="note" aria-label={label}>
      <span className="chip">{label}</span>
      <span className="small">{children}</span>
    </div>
  );
}
