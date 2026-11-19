import { Navigate, useNavigate } from "react-router";
import { useReportFlow } from "../flow/flow-context.ts";
import { BackIcon, BuildingIcon, ExternalIcon, TagIcon } from "../icons.tsx";

// Result: shows what FixFinder found, with the photo, the category, the responsible party, and its source.
// Layout and wording follow the prototype's review screen. Its Change controls and draft button are left out:
// correcting the guess and drafting the report are not part of #1, and a control that does nothing is a false signifier.
export function Result() {
  const { photo, result } = useReportFlow();
  const navigate = useNavigate();

  // A reload or a direct visit has nothing in memory to show.
  if (!photo || !result) return <Navigate to="/" replace />;

  return (
    <main className="screen">
      <div className="scroll">
        <div className="top">
          <button type="button" className="back" onClick={() => navigate("/")}>
            <BackIcon />
            Retake photo
          </button>
        </div>
        <div className="photo-row">
          <img className="thumb large" src={photo.url} alt="Your photo" />
          <h1 className="h-l">Here is what FixFinder found</h1>
        </div>
        {result.placeholder && (
          <div className="card pad stack placeholder-note" role="note" aria-label="Placeholder result">
            <span className="chip">Placeholder result</span>
            <span className="small">
              FixFinder does not read photos yet. This is sample output, the same for every photo and location.
            </span>
          </div>
        )}
        <div className="card rows">
          <div className="row">
            <TagIcon />
            <div className="stack grow">
              <span className="field-name">Category</span>
              <span className="value">{result.category}</span>
              <span className="small">{result.description}</span>
            </div>
          </div>
          <div className="row">
            <BuildingIcon />
            <div className="stack grow">
              <span className="field-name">Responsible party</span>
              <span className="value">{result.responsibleParty}</span>
              <a className="source" href={result.source.url} target="_blank" rel="noopener noreferrer">
                Source: {result.source.name}
                <ExternalIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => navigate("/")}>
          Done
        </button>
      </div>
    </main>
  );
}
