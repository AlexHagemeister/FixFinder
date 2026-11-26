import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { MAX_DESCRIPTION_CHARS, normalizeDescription, useReportFlow } from "../flow/flow-context.ts";
import { BackIcon, BuildingIcon, ExternalIcon, PinIcon, TagIcon } from "../icons.tsx";
import { PhotoInput } from "./PhotoInput.tsx";

// A field's name, with a chip when the value is sample output or was edited by the user.
function FieldName({ name, sample = false, edited = false }: { name: string; sample?: boolean; edited?: boolean }) {
  const chip = edited ? { label: "Your edit", tone: "edited" } : sample ? { label: "Sample", tone: "sample" } : null;
  if (!chip) return <span className="field-name">{name}</span>;
  return (
    <span className="field-head">
      <span className="field-name">{name}</span>
      <span className={`chip ${chip.tone}`}>{chip.label}</span>
    </span>
  );
}

// Result: shows what FixFinder found, with the photo, the description, the location, the responsible party, and its source.
// The user can edit the description here (invariants 5 and 8); correcting the location and drafting the report are separate.
export function Result() {
  const { photo, location, description, result, startReport, editDescription } = useReportFlow();
  const navigate = useNavigate();
  const photoInput = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!editing && shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);

  // A reload or a direct visit has nothing in memory to show.
  if (!photo) return <Navigate to="/" replace />;
  // A photo with no result is Retake photo starting a new report, on its way to Working. Sending the user Home here
  // would end that report, so the screen stays blank for the moment it takes.
  if (!result || !description) return null;

  const currentDescription = description;

  function startEditing() {
    setDraft(currentDescription.text);
    setEditing(true);
  }

  function cancelEditing() {
    shouldRestoreFocusRef.current = true;
    setEditing(false);
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    const trimmed = normalizeDescription(draft);
    if (trimmed) editDescription(trimmed);
    shouldRestoreFocusRef.current = true;
    setEditing(false);
  }

  return (
    <main className="screen">
      <div className="scroll">
        <div className="top">
          {/* Retake photo opens the camera, as its label says, and a new photo starts a new report. If the user closes
              the camera without a photo, Result stays. */}
          <button type="button" className="back" onClick={() => photoInput.current?.click()}>
            <BackIcon />
            Retake photo
          </button>
          <PhotoInput ref={photoInput} onPick={startReport} />
        </div>
        <div className="photo-row">
          <img className="thumb large" src={photo.url} alt="Your photo" />
          <h1 className="h-l">Here is what FixFinder found</h1>
        </div>
        <div className="card rows">
          {editing ? (
            <div className="row">
              <TagIcon />
              <form className="stack grow edit-description-form" onSubmit={onSave}>
                <label className="field-name" htmlFor="edit-description">
                  Description
                </label>
                <input
                  id="edit-description"
                  className="text-input"
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") cancelEditing();
                  }}
                  maxLength={MAX_DESCRIPTION_CHARS}
                  autoComplete="off"
                  enterKeyHint="done"
                  autoFocus
                />
                <div className="btn-row">
                  <button type="button" className="btn small" onClick={cancelEditing}>
                    Cancel
                  </button>
                  <button type="submit" className="btn small primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button ref={editButtonRef} type="button" className="row row-button" onClick={startEditing}>
              <TagIcon />
              <span className="stack grow">
                {/* A Sample chip marks stand-in output; "Your edit" marks a description the user changed here. */}
                <FieldName name="Description" sample={currentDescription.sample} edited={currentDescription.edited} />
                <span className="value">{currentDescription.text}</span>
              </span>
              <span className="row-action">Edit</span>
            </button>
          )}
          {location && (
            <div className="row">
              <PinIcon />
              <div className="stack grow">
                <span className="field-name">Location</span>
                {location.location ? (
                  <>
                    <span className="value">{location.location}</span>
                    {/* OpenStreetMap's licence asks for this credit wherever its data is shown. */}
                    <a
                      className="source"
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Location names © OpenStreetMap contributors
                      <ExternalIcon />
                    </a>
                  </>
                ) : (
                  <span className="small">
                    FixFinder couldn't put this location into words. It still uses where your phone was to find who
                    is responsible.
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="row">
            <BuildingIcon />
            <div className="stack grow">
              <FieldName name="Responsible party" sample={result.placeholder} />
              <span className="value">{result.responsibleParty}</span>
              <a className="source" href={result.source.url} target="_blank" rel="noopener noreferrer">
                Source: {result.source.name}
                <ExternalIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
      {!editing && (
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => navigate("/")}>
            Done
          </button>
        </div>
      )}
    </main>
  );
}
