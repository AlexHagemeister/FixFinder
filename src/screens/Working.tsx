import { Navigate, useNavigate } from "react-router";
import { STEP_ORDER, useReportFlow, type StepId, type StepStatus } from "../flow/flow-context.ts";
import { CheckIcon } from "../icons.tsx";

// Working: shows each step FixFinder takes on the report and whether it worked (VISION invariant 7, Nielsen 1).
// Steps and wording follow the core-app prototype, minus "Drafting the report", which #1 leaves out.

const STEP_COPY: Record<StepId, { title: string; current: string; done: string }> = {
  photo: { title: "Reading the photo", current: "Looking at what the photo shows", done: "Photo read" },
  location: { title: "Pinning down the location", current: "Getting your location", done: "Location found" },
  responsibleParty: { title: "Finding who is responsible", current: "Checking who maintains this location", done: "" },
};

function StepMark({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="mark done">
        <CheckIcon />
      </div>
    );
  }
  return <div className="mark">{status === "current" ? <div className="spin" /> : <div className="wait" />}</div>;
}

export function Working() {
  const { photo, steps, location, description, result } = useReportFlow();
  const navigate = useNavigate();

  // A reload or a direct visit has no photo in memory, so there is nothing to work on.
  if (!photo) return <Navigate to="/" replace />;

  const doneCount = STEP_ORDER.filter((id) => steps[id] === "done").length;
  const allDone = doneCount === STEP_ORDER.length;
  const progress = allDone ? `All ${STEP_ORDER.length} steps done` : `Step ${doneCount + 1} of ${STEP_ORDER.length}`;

  return (
    <main className="screen">
      <div className="scroll">
        <div className="top">
          {/* Cancel lands on Home, which ends the run (user control and freedom, Nielsen 3). */}
          <button type="button" className="back" onClick={() => navigate("/")}>
            Cancel
          </button>
          <span className="small" aria-live="polite">
            {progress}
          </span>
        </div>
        <div className="photo-row">
          <img className="thumb" src={photo.url} alt="Your photo" />
          <div className="stack">
            <span className="eyebrow">Your photo</span>
            <span className="body-15">Taken just now</span>
          </div>
        </div>
        <h1 className="h-l">Working on your report</h1>
        <ol className="card steps" aria-label="Steps">
          {STEP_ORDER.map((id) => {
            const status = steps[id];
            const copy = STEP_COPY[id];
            // A finished step shows what it found (Nielsen 1): the description, the location in words, and the
            // responsible party. A location FixFinder could not name keeps the plain "Location found".
            const doneDetail =
              id === "responsibleParty"
                ? (result?.responsibleParty ?? "")
                : id === "location"
                  ? (location?.location ?? copy.done)
                  : (description?.text ?? copy.done);
            const detail = status === "done" ? doneDetail : status === "current" ? copy.current : "Waiting";
            return (
              <li key={id} className={`step ${status}`}>
                <StepMark status={status} />
                <div className="stack">
                  <span className="step-title">{copy.title}</span>
                  <span className="small">{detail}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
