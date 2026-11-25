import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { phoneWillNotAskAgain } from "../location/permission.ts";
import { findLocation } from "../location/location-detail.ts";
import { getPosition, PositionError, type Position } from "../location/position.ts";
import { describePhoto } from "../lookup/describe-photo.ts";
import { readablePhoto } from "../lookup/readable-photo.ts";
import { lookup, type LookupResponse } from "../lookup/lookup.ts";
import {
  FlowContext,
  normalizeDescription,
  type FlowState,
  type FlowValue,
  type PhotoDescription,
  type PhotoProblem,
  type StepId,
  type StepStatus,
} from "./flow-context.ts";
import { NOTICES } from "./notices.ts";
import { reloadPage } from "./reload.ts";
import { clearPhoto, loadPhoto, SAVED_PHOTO_MAX_AGE_MS, savePhoto } from "./saved-photo.ts";
import { FINISH_PAUSE_MS, STEP_MIN_MS } from "./timing.ts";

// A denial never reaches this: it opens the Location needed screen instead of a notice on Home.
function positionNotice(error: unknown): string {
  if (error instanceof PositionError && error.reason === "unsupported") return NOTICES.locationUnsupported;
  return NOTICES.locationFailed;
}

/** How the ask for location ended. `answeredInMs` times the ask alone, without the step's pacing pause. */
type PositionOutcome = { position: Position } | { error: unknown; answeredInMs: number };

const ALL_WAITING: Record<StepId, StepStatus> = { photo: "waiting", location: "waiting", responsibleParty: "waiting" };
const AT_LOCATION: Record<StepId, StepStatus> = { photo: "done", location: "current", responsibleParty: "waiting" };
const EMPTY: FlowState = {
  photo: null,
  steps: ALL_WAITING,
  location: null,
  description: null,
  photoProblem: null,
  result: null,
  notice: null,
  locationNeeded: null,
};

/** Where a run starts: a new report reads the photo, and a report picked back up already has its description. */
type RunStart = { from: "photo" } | { from: "location"; description: PhotoDescription };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Holds the report in progress for the Working, Location needed, and Result screens, and runs its steps.
// It is the root route's element, so every screen (and every test that renders `routes`) sits inside it.
export function ReportFlow() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [state, setState] = useState<FlowState>(EMPTY);
  // Each run gets a number. A run that is no longer the latest (cancelled or replaced) stops quietly.
  const runRef = useRef(0);
  const photoUrlRef = useRef<string | null>(null);
  // True while Ask again is saving the photo before its reload, so a second tap does nothing.
  const askingRef = useRef(false);
  // App start reads the saved photo once. The ref keeps StrictMode's second effect run from reading it again.
  const restoreStartedRef = useRef(false);
  // Where app start is taking the user: undefined while it reads the saved photo, a path while it navigates there,
  // and null once it is done. Screens wait for it, so Working, Location needed, and Result do not send the user Home
  // before the photo is back in memory.
  const [restoreTarget, setRestoreTarget] = useState<string | null | undefined>(undefined);
  const restoring = restoreTarget === undefined || (restoreTarget !== null && pathname !== restoreTarget);

  const releasePhoto = useCallback(() => {
    if (photoUrlRef.current) {
      URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = null;
    }
  }, []);

  // Landing on Home ends any report in progress, however the user got there: Cancel, Not now, Retake photo, Done, the
  // back gesture, or a run that stopped early. A stopped run's notice stays so Home can show it. The saved photo goes
  // too. While app start is still restoring, Home is not a landing: the saved photo may be on its way back.
  useEffect(() => {
    if (pathname !== "/" || restoring) return;
    runRef.current += 1;
    askingRef.current = false;
    releasePhoto();
    void clearPhoto();
    setState((current) => ({ ...EMPTY, notice: current.notice }));
  }, [pathname, restoring, releasePhoto]);

  // Leaving Home for another tab clears a stopped run's notice. Home re-mounts on every tab switch, so a kept notice
  // would come back on the return and be announced again as if something had just failed (Nielsen 1).
  useEffect(() => {
    if (pathname !== "/reports" && pathname !== "/settings") return;
    setState((current) => (current.notice ? { ...current, notice: null } : current));
  }, [pathname]);

  // Once app start reaches the screen it was heading for, it is done.
  useEffect(() => {
    if (restoreTarget && pathname === restoreTarget) setRestoreTarget(null);
  }, [restoreTarget, pathname]);

  const holdPhoto = useCallback(
    (file: File) => {
      releasePhoto();
      const url = URL.createObjectURL(file);
      photoUrlRef.current = url;
      return { file, url };
    },
    [releasePhoto],
  );

  // Runs the report's steps for `file`. A new report starts at the photo step. Ask again starts at the location step,
  // so the photo step stays done, its description is kept, and the same photo goes to the lookup.
  const runSteps = useCallback(
    (taken: File, start: RunStart) => {
      let file = taken;
      const run = ++runRef.current;
      const isLatest = () => runRef.current === run;
      const stop = (notice: string) => {
        if (!isLatest()) return;
        setState((current) => ({ ...current, notice }));
        navigate("/", { replace: true });
      };

      void (async () => {
        let description: PhotoDescription;
        if (start.from === "photo") {
          // Step 1: reading the photo. Some phones leave the file's kind blank, so only a known non-photo stops here.
          if (file.type && !file.type.startsWith("image/")) return stop(NOTICES.notAPhoto);
          // A HEIC photo this browser cannot show becomes a JPEG, and the report carries on with that one.
          const readable = await readablePhoto(file);
          if (!isLatest()) return;
          if (readable !== file) {
            file = readable;
            // Held outside the updater: holdPhoto revokes the previous URL, and an updater can run twice.
            const held = holdPhoto(readable);
            setState((current) => ({ ...current, photo: held }));
          }
          const [reading] = await Promise.all([describePhoto(file), pause(STEP_MIN_MS)]);
          if (!isLatest()) return;
          if (reading.outcome !== "described") {
            // The run stops on Working, which says what went wrong and offers next steps with the same photo.
            const photoProblem: PhotoProblem = reading.outcome;
            setState((current) => ({ ...current, photoProblem, steps: { ...current.steps, photo: "failed" } }));
            return;
          }
          description = { text: reading.description, sample: reading.sample };
          setState((current) => ({
            ...current,
            description,
            steps: { ...current.steps, photo: "done", location: "current" },
          }));
        } else {
          description = start.description;
        }

        // Step 2: pinning down the location. A failure also waits out the step's pause, so after Ask again the
        // Working screen shows "Getting your location" before a second denial leads back.
        const askedAt = Date.now();
        const [outcome] = await Promise.all([
          getPosition().then(
            (position): PositionOutcome => ({ position }),
            (error: unknown): PositionOutcome => ({ error, answeredInMs: Date.now() - askedAt }),
          ),
          pause(STEP_MIN_MS),
        ]);
        if (!isLatest()) return;
        if ("error" in outcome) {
          if (!(outcome.error instanceof PositionError && outcome.error.reason === "denied")) {
            return stop(positionNotice(outcome.error));
          }
          // Denied: FixFinder stops here and does not look anything up. The photo stays in memory for Ask again, and
          // is saved on the phone too, in case the phone closes FixFinder while the user is in the Settings app.
          const phoneWillNotAsk = await phoneWillNotAskAgain(outcome.answeredInMs);
          if (!isLatest()) return;
          void savePhoto(file, { phoneWillNotAsk, resumeAtLocation: false, description });
          // A denial that answers Ask again says so on screen, so the tap visibly did something (Nielsen 1).
          const stillOff = start.from === "location";
          setState((current) => ({ ...current, locationNeeded: { phoneWillNotAsk, stillOff } }));
          // Replace, so the back gesture from Location needed goes to Home.
          navigate("/location-needed", { replace: true });
          return;
        }
        const { position } = outcome;
        // Puts the position into words. This never fails: without a name, the report carries on with the exact position.
        const found = await findLocation(position);
        if (!isLatest()) return;
        // The denial is behind us now. Clearing it here, not in Ask again, keeps Location needed from sending the
        // user Home while the navigation to Working is still on its way.
        setState((current) => ({
          ...current,
          location: found,
          locationNeeded: null,
          steps: { ...current.steps, location: "done", responsibleParty: "current" },
        }));

        // Step 3: finding who is responsible.
        let result: LookupResponse;
        try {
          [result] = await Promise.all([
            lookup({ photo: file, location: found.detail }),
            pause(STEP_MIN_MS),
          ]);
        } catch {
          return stop(NOTICES.lookupFailed);
        }
        if (!isLatest()) return;
        setState((current) => ({ ...current, result, steps: { ...current.steps, responsibleParty: "done" } }));
        // The report no longer needs a saved photo: Result holds it in memory, and a reload there goes Home.
        void clearPhoto();

        await pause(FINISH_PAUSE_MS);
        if (!isLatest()) return;
        // Replace, so the back gesture from Result skips the finished Working screen.
        navigate("/result", { replace: true });
      })();
    },
    [navigate, holdPhoto],
  );

  const startReport = useCallback(
    (file: File) => {
      askingRef.current = false;
      setState({
        photo: holdPhoto(file),
        steps: { ...ALL_WAITING, photo: "current" },
        location: null,
        description: null,
        photoProblem: null,
        result: null,
        notice: null,
        locationNeeded: null,
      });
      navigate("/working");
      runSteps(file, { from: "photo" });
    },
    [navigate, holdPhoto, runSteps],
  );

  // App start: if a photo was saved for a report on the Location needed screen, and it is fresh, pick that report
  // back up. After Ask again's reload, it runs the location step. After the app was closed and opened again, it goes
  // back to Location needed with the photo. A stale record is removed and the app starts on Home as usual.
  useEffect(() => {
    if (restoreStartedRef.current) return;
    restoreStartedRef.current = true;
    void (async () => {
      const saved = await loadPhoto();
      if (!saved || Date.now() - saved.savedAt > SAVED_PHOTO_MAX_AGE_MS) {
        if (saved) void clearPhoto();
        setRestoreTarget(null);
        return;
      }
      const { photo: file, phoneWillNotAsk, resumeAtLocation, description } = saved;
      // Location needed stays set until the location step works, so that screen never sends the user Home on the way.
      setState({
        photo: holdPhoto(file),
        steps: AT_LOCATION,
        location: null,
        description,
        photoProblem: null,
        result: null,
        notice: null,
        locationNeeded: { phoneWillNotAsk, stillOff: false },
      });
      if (resumeAtLocation) {
        // The resume is used up. If the page loads again before the step ends, it opens Location needed instead.
        void savePhoto(file, { phoneWillNotAsk, resumeAtLocation: false, description });
        setRestoreTarget("/working");
        // Replace, so the back gesture from Working goes to Home and not to the Location needed screen.
        navigate("/working", { replace: true });
        runSteps(file, { from: "location", description });
      } else {
        setRestoreTarget("/location-needed");
        navigate("/location-needed", { replace: true });
      }
    })();
  }, [navigate, holdPhoto, runSteps]);

  const photo = state.photo;
  const description = state.description;
  const phoneWillNotAsk = state.locationNeeded?.phoneWillNotAsk ?? false;
  const askAgain = useCallback(() => {
    if (!photo || !description || askingRef.current) return;
    askingRef.current = true;
    void (async () => {
      // Safari keeps a denial for the life of the page, so the ask happens after a reload. The saved photo carries
      // the report across it, and app start runs the location step.
      if (await savePhoto(photo.file, { phoneWillNotAsk, resumeAtLocation: true, description })) {
        reloadPage();
        return;
      }
      // The photo could not be saved, so the report carries on in memory, on this page.
      askingRef.current = false;
      setState((current) => ({ ...current, steps: AT_LOCATION, location: null, result: null }));
      // Replace, so the back gesture from Working goes to Home and not to the Location needed screen.
      navigate("/working", { replace: true });
      runSteps(photo.file, { from: "location", description });
    })();
  }, [photo, description, phoneWillNotAsk, navigate, runSteps]);

  const retryPhoto = useCallback(() => {
    if (!photo) return;
    setState((current) => ({ ...current, photoProblem: null, steps: { ...ALL_WAITING, photo: "current" } }));
    runSteps(photo.file, { from: "photo" });
  }, [photo, runSteps]);

  const describeItYourself = useCallback(
    (text: string) => {
      if (!photo) return;
      const own: PhotoDescription = { text, sample: false, byUser: true };
      setState((current) => ({ ...current, description: own, photoProblem: null, steps: AT_LOCATION }));
      // Replace, so the back gesture from Working goes to Home and not back to Describe it yourself.
      navigate("/working", { replace: true });
      runSteps(photo.file, { from: "location", description: own });
    },
    [photo, navigate, runSteps],
  );

  const editDescription = useCallback((text: string) => {
    const trimmed = normalizeDescription(text);
    if (!trimmed) return;
    setState((current) => {
      if (!current.description || current.description.text === trimmed) return current;
      return {
        ...current,
        description: { ...current.description, text: trimmed, sample: false, edited: true },
      };
    });
  }, []);

  const value = useMemo<FlowValue>(
    () => ({ ...state, startReport, askAgain, retryPhoto, describeItYourself, editDescription }),
    [state, startReport, askAgain, retryPhoto, describeItYourself, editDescription],
  );

  return (
    <FlowContext value={value}>
      {/* Blank for the moment app start takes to look for a saved photo. */}
      {restoring ? null : <Outlet />}
    </FlowContext>
  );
}
