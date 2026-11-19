import { Navigate, useNavigate } from "react-router";
import { useReportFlow } from "../flow/flow-context.ts";
import { PinOffIcon } from "../icons.tsx";
import { detectPlatform, isHomeScreenApp, type SettingsPlatform } from "../location/platform.ts";

// Location needed: shown when the user denies location. FixFinder stops here and does not look anything up.
// Layout and wording follow the prototype's "FixFinder needs your location" screen.

// The prototype's general wording, used where a platform's steps could not be checked against its maker's own help.
const GENERAL_STEP = "Turn on location for this site in your browser settings.";

// Steps for turning location back on, one list per platform. Each step was checked against the maker's own help:
// - Location Services: https://support.apple.com/en-us/102647
// - Safari's location setting and per-site exceptions: https://support.apple.com/guide/iphone/browse-the-web-privately-iphb01fc3c85/ios
// - Android's Use location: https://support.google.com/android/answer/3467281
// - Chrome's Site controls and Permissions: https://support.google.com/chrome/answer/114662?co=GENIE.Platform%3DAndroid
// - Chrome's More button on the right of the address bar: https://support.google.com/chrome/answer/142065?co=GENIE.Platform%3DAndroid
// Neither maker's per-site page names the choices on that last screen, so those steps say what to do, not which label.
// No Apple page says how a home-screen app's location is set, so that list keeps the general wording after the
// Location Services step, which holds for every iPhone app.
const LOCATION_SERVICES_STEP =
  "Open the Settings app, tap Privacy & Security, then Location Services. Make sure Location Services is on.";

const SETTINGS_STEPS: Record<SettingsPlatform, string[]> = {
  iphoneSafari: [
    LOCATION_SERVICES_STEP,
    "In Settings, tap Apps, then Safari. Tap Location, then choose Ask or Allow.",
    "In Safari, on this page, tap the Page Menu button on the left side of the search field, then tap Website Settings. Below Website Settings For, tap Location and change it so FixFinder can use your location.",
  ],
  iphoneHomeScreen: [LOCATION_SERVICES_STEP, GENERAL_STEP],
  androidChrome: [
    "Open the Settings app, tap Location, and turn on Use location.",
    "In Chrome, on this page, tap More on the right of the address bar, then Site controls, then Permissions.",
    "Tap Location and change it so FixFinder can use your location.",
  ],
  other: [GENERAL_STEP],
};

function SettingsSteps() {
  const steps = SETTINGS_STEPS[detectPlatform(navigator.userAgent, isHomeScreenApp())];
  return (
    <>
      <span className="small">If your phone does not ask, turn location on in its settings:</span>
      <ol className="settings-steps small" aria-label="Steps to turn location on">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
        <li>Come back to FixFinder and tap Ask again.</li>
      </ol>
    </>
  );
}

export function LocationNeeded() {
  const { photo, locationNeeded, askAgain } = useReportFlow();
  const navigate = useNavigate();

  // A direct visit has no report in memory, so there is nothing to ask again for. After a reload, app start puts
  // the saved photo back before this screen renders (see ReportFlow).
  if (!photo || !locationNeeded) return <Navigate to="/" replace />;

  return (
    <main className="screen">
      <div className="scroll">
        <div className="spacer short" />
        <div className="big-mark warn">
          <PinOffIcon />
        </div>
        <h1 className="h-l">FixFinder needs your location</h1>
        <p className="lead">
          Who fixes a problem depends on where it is. Without your location, FixFinder cannot find the responsible
          party, so it stops here.
        </p>
        {/* After Ask again, a second denial says so, so the tap visibly did something (Nielsen 1). An alert, not a
            status: the line arrives with the screen, and a status region that mounts already filled is often silent. */}
        {locationNeeded.stillOff && (
          <p className="notice" role="alert">
            Location is still off for FixFinder.
          </p>
        )}
        <div className="card pad stack turn-on">
          <strong className="turn-on-title">To turn it on</strong>
          {locationNeeded.phoneWillNotAsk ? (
            <SettingsSteps />
          ) : (
            <span className="small">
              Tap Ask again, then choose Allow when your phone asks. If it does not ask, turn on location for this
              site in your browser settings.
            </span>
          )}
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn primary" onClick={askAgain}>
          Ask again
        </button>
        {/* Not now lands on Home, which ends the report (user control and freedom, Nielsen 3). */}
        <button type="button" className="btn text" onClick={() => navigate("/")}>
          Not now
        </button>
      </div>
    </main>
  );
}
