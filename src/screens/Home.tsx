import { useRef, type ChangeEvent } from "react";
import { useReportFlow } from "../flow/flow-context.ts";
import { CameraIcon, WrenchIcon } from "../icons.tsx";

// Home: the first screen, where the user starts a report by taking a photo.
export function Home() {
  const { startReport, notice } = useReportFlow();
  const photoInput = useRef<HTMLInputElement>(null);

  function onPhotoPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so taking the same photo again still counts as a change.
    event.target.value = "";
    if (file) startReport(file);
  }

  return (
    <main className="screen">
      <div className="scroll">
        <div className="brand">
          <WrenchIcon />
          <span>FixFinder</span>
        </div>
        <div className="spacer" />
        <h1 className="h-xl">See something broken?</h1>
        <p className="lead">
          Take a photo. FixFinder works out who is responsible for fixing it and drafts the report. You
          check it before it goes anywhere.
        </p>
        <div className="spacer" />
        {notice && (
          <p className="notice" role="alert">
            {notice}
          </p>
        )}
        <p className="small center">FixFinder will ask for your location to find who is responsible.</p>
      </div>
      <div className="actions">
        {/* The button opens the phone's rear camera through the hidden file input. The photo stays on the phone. */}
        <button type="button" className="btn primary" onClick={() => photoInput.current?.click()}>
          <CameraIcon />
          Take a photo
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPhotoPicked}
        />
      </div>
    </main>
  );
}
