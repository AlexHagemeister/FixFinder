import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { MAX_DESCRIPTION_CHARS, normalizeDescription, useReportFlow } from "../flow/flow-context.ts";
import { BackIcon } from "../icons.tsx";

// Describe it yourself: when FixFinder couldn't read the photo, the user types the description, and the report carries
// on to Working and Result with the same photo. Back returns to Working, where the other next step still waits.
export function DescribeYourself() {
  const { photo, describeItYourself } = useReportFlow();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const description = normalizeDescription(text);

  // A reload or a direct visit has no photo in memory.
  if (!photo) return <Navigate to="/" replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (description) describeItYourself(description);
  }

  return (
    <main className="screen">
      <div className="scroll">
        <div className="top">
          <button type="button" className="back" onClick={() => navigate("/working", { replace: true })}>
            <BackIcon />
            Back
          </button>
        </div>
        <div className="photo-row">
          <img className="thumb" src={photo.url} alt="Your photo" />
          <h1 className="h-l">Describe the problem</h1>
        </div>
        <form id="describe-form" className="stack describe-form" onSubmit={onSubmit}>
          <label className="field-label" htmlFor="own-description">
            What is wrong?
          </label>
          <input
            id="own-description"
            className="text-input"
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={MAX_DESCRIPTION_CHARS}
            placeholder="Like: Overflowing trash can"
            autoComplete="off"
            enterKeyHint="go"
            autoFocus
          />
          <span className="small">A few words is enough. FixFinder uses it to find who is responsible.</span>
        </form>
      </div>
      <div className="actions">
        {/* Continue stays off until there is something to send, so an empty description cannot reach Result. */}
        <button type="submit" form="describe-form" className="btn primary" disabled={!description}>
          Continue
        </button>
      </div>
    </main>
  );
}
