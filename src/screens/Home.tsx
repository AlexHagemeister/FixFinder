import { useRef, useState } from "react";
import { Link } from "react-router";
import { useReportFlow } from "../flow/flow-context.ts";
import { CameraIcon, WrenchIcon } from "../icons.tsx";
import { PhotoInput } from "./PhotoInput.tsx";
import { PlaceholderNote } from "./PlaceholderNote.tsx";
import { SAMPLE_NEARBY, SAMPLE_REPORTS, SAMPLE_STILL_THERE, statusLine } from "./samples.ts";

// A section heading with the chip that marks its content as a sample.
function SampleHead({ title }: { title: string }) {
  return (
    <div className="section-head">
      <h2 className="eyebrow">{title}</h2>
      <span className="chip sample">Sample</span>
    </div>
  );
}

// Home's placeholder sections, from the core-app prototype's home screen for a returning user. The content is sample
// content, and the team will likely put something different here. The buttons answer a tap the way the prototype's do,
// so the sections give a feel for using them, but nothing is saved or sent.
function PlaceholderSections() {
  const latest = SAMPLE_REPORTS[0];
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [stillAnswer, setStillAnswer] = useState<string | null>(null);

  return (
    <>
      <PlaceholderNote label="Placeholder">
        The sections below show sample content, to give a feel for what Home could hold. What goes here is still to be
        decided.
      </PlaceholderNote>

      <section className="stack section" aria-label="Your latest report">
        <SampleHead title="Your latest report" />
        <div className="card pad stack sample-card">
          <div className="row-between">
            <strong className="report-title">{latest.category}</strong>
            <span className="pill">{latest.status}</span>
          </div>
          <span className="small">{latest.location}</span>
          <span className="body-15">{statusLine(latest)}</span>
          <Link className="link-btn" to="/reports">
            See all your reports
          </Link>
        </div>
      </section>

      <section className="stack section" aria-label="Problems near you">
        <SampleHead title="Problems near you" />
        {SAMPLE_NEARBY.map((problem) => {
          const on = followed[problem.category] ?? false;
          return (
            <div key={problem.category} className="card pad near-card">
              <div className="grow stack">
                <strong className="report-title">{problem.category}</strong>
                <span className="small">{problem.location}</span>
                <span className="label">
                  Reported by {problem.people} people · {problem.when}
                </span>
              </div>
              <button
                type="button"
                className={on ? "btn small on" : "btn small"}
                aria-pressed={on}
                aria-label={`${on ? "Following" : "Follow"} ${problem.category}`}
                onClick={() => setFollowed((current) => ({ ...current, [problem.category]: !on }))}
              >
                {on ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </section>

      <section className="stack section" aria-label="Is this still there?">
        <SampleHead title="Is this still there?" />
        <div className="card pad stack sample-card">
          <div className="stack">
            <strong className="report-title">{SAMPLE_STILL_THERE.category}</strong>
            <span className="small">
              {SAMPLE_STILL_THERE.location} · reported {SAMPLE_STILL_THERE.when}
            </span>
          </div>
          {stillAnswer ? (
            <span className="thanks" role="status">
              Thanks for checking. You said: {stillAnswer}. (Sample: nothing was saved.)
            </span>
          ) : (
            <div className="btn-row">
              <button type="button" className="btn small" onClick={() => setStillAnswer("still there")}>
                Still there
              </button>
              <button type="button" className="btn small" onClick={() => setStillAnswer("it is gone")}>
                It is gone
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// Home: the first screen, where the user starts a report by taking a photo or choosing one already on their phone.
export function Home() {
  const { startReport, notice } = useReportFlow();
  const photoInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  return (
    <main className="screen">
      <div className="scroll">
        <div className="brand">
          <WrenchIcon />
          <span>FixFinder</span>
        </div>
        <h1 className="h-l">See something broken?</h1>
        <p className="lead">
          Take a photo. FixFinder works out who is responsible for fixing it and drafts the report. You
          check it before it goes anywhere.
        </p>
        <p className="small">FixFinder will ask for your location to find who is responsible.</p>
        {notice && (
          <p className="notice" role="alert">
            {notice}
          </p>
        )}
        <PlaceholderSections />
      </div>
      <div className="actions">
        {/* The button opens the phone's rear camera through the hidden file input. The photo stays on the phone. */}
        <button type="button" className="btn primary" onClick={() => photoInput.current?.click()}>
          <CameraIcon />
          Take a photo
        </button>
        <PhotoInput ref={photoInput} onPick={startReport} />
        {/* The quieter way in: a photo already on the phone goes through the same report flow as a taken one. */}
        <button type="button" className="btn text" onClick={() => libraryInput.current?.click()}>
          Choose from your photos
        </button>
        <PhotoInput ref={libraryInput} onPick={startReport} source="library" />
      </div>
    </main>
  );
}
