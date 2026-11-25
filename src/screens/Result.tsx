import { useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useReportFlow } from "../flow/flow-context.ts";
import { BackIcon, BuildingIcon, ExternalIcon, PinIcon, TagIcon } from "../icons.tsx";
import { PhotoInput } from "./PhotoInput.tsx";
import { ChangeLocation } from "./ChangeLocation.tsx";

export function Result() {
  const { photo, location, correctedLocation, result, startReport, setCorrectedLocation } = useReportFlow();
  const navigate = useNavigate();
  const photoInput = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const editingLocation = searchParams.has("change-location");
  const shownLocation = correctedLocation ?? location;

  // A reload or a direct visit has nothing in memory to show.
  if (!photo) return <Navigate to="/" replace />;
  // A photo with no result is Retake photo starting a new report, on its way to Working. Sending the user Home here
  // would end that report, so the screen stays blank for the moment it takes.
  if (!result) return null;

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
        {result.placeholder && (
          <div className="card pad stack placeholder-note" role="note" aria-label="Placeholder result">
            <span className="chip">Placeholder result</span>
            <span className="small">
              FixFinder does not read photos yet. Everything here except the location is sample output, the same for every photo.
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
          {shownLocation && (
            <div className="row">
              <PinIcon />
              <div className="stack grow">
                <button
                  type="button"
                  className="location-change"
                  aria-label="Change location"
                  aria-describedby="result-location"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("change-location", "");
                    setSearchParams(next);
                  }}
                >
                  <span className="stack grow">
                    <span className="field-name">Location</span>
                    <span className="value" id="result-location">{shownLocation.location ?? "Location name unavailable"}</span>
                  </span>
                  <span className="location-change-signifier">Change</span>
                </button>
                {correctedLocation && <span className="chip location-pick">Your pick</span>}
                {shownLocation.location ? (
                  <>
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
                ) : correctedLocation ? (
                  <span className="small">FixFinder saved the pin you chose.</span>
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
              <span className="field-name">Responsible party</span>
              <span className="value">{result.responsibleParty}</span>
              {correctedLocation && (
                <span className="small">FixFinder used its original location for this lookup.</span>
              )}
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
      {editingLocation && shownLocation && (
        <ChangeLocation
          location={shownLocation}
          onCancel={() => navigate(-1)}
          onConfirm={(found) => {
            setCorrectedLocation(found);
            navigate(-1);
          }}
        />
      )}
    </main>
  );
}
