import { CameraIcon, WrenchIcon } from "../icons.tsx";

// Home: the first screen, where the user starts a report by taking a photo.
export function Home() {
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
        <p className="small center">FixFinder will ask for your location to find who is responsible.</p>
      </div>
      <div className="actions">
        {/* Round 2 wires this to the camera. */}
        <button type="button" className="btn primary">
          <CameraIcon />
          Take a photo
        </button>
      </div>
    </main>
  );
}
